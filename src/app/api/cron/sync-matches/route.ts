// Sync automático de partidos desde football-data.org · cron
//
// Lo dispara un scheduler externo (mismo patrón que match-reminders) con el
// header x-cron-secret. En días de partido conviene cada ~3-5 min.
//
// Qué automatiza:
//   1. Horarios     → actualiza scheduledAt y recalcula deadlineAt (-1h) · RB-04
//   2. Cuadro KO    → rellena home/awayTeamId cuando la API define los cruces
//   3. Estado       → scheduled / live / finished
//   4. Resultados   → al FINISHED escribe el marcador a 90' y recalcula puntos
//
// Override del organizador: NUNCA toca el estado/resultado de un partido con
// resultSource='manual' (admin/results o admin/live). Los horarios y el cuadro
// KO sí se sincronizan siempre (no afectan puntos).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, teams, tournaments } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { applyMatchResult } from "@/lib/apply-result";
import { fetchWorldCupMatches, mapStatus, mapResult } from "@/lib/football-data";

const HOUR_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const tournament = await db.query.tournaments.findFirst({
    where: or(eq(tournaments.status, "active"), eq(tournaments.status, "draft")),
    columns: { id: true },
  });
  if (!tournament) return NextResponse.json({ ok: true, reason: "sin torneo activo" });

  // Mapa externalId (id de la API) → nuestro teamId, para rellenar el cuadro KO
  const ourTeams = await db.select({ id: teams.id, externalId: teams.externalId }).from(teams);
  const teamByExt = new Map<number, string>();
  for (const t of ourTeams) if (t.externalId != null) teamByExt.set(t.externalId, t.id);

  // Nuestros partidos del torneo, indexados por externalId
  const ourMatches = await db
    .select({
      id: matches.id,
      externalId: matches.externalId,
      status: matches.status,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      scheduledAt: matches.scheduledAt,
      stage: matches.stage,
      resultSource: matches.resultSource,
      tournamentId: matches.tournamentId,
    })
    .from(matches)
    .where(eq(matches.tournamentId, tournament.id));

  const ourByExt = new Map<number, (typeof ourMatches)[number]>();
  for (const m of ourMatches) if (m.externalId != null) ourByExt.set(m.externalId, m);

  const apiMatches = await fetchWorldCupMatches();

  const now = new Date();
  const summary = {
    scheduleUpdated: 0,
    teamsFilled: 0,
    statusUpdated: 0,
    liveScoreUpdated: 0,
    resultsApplied: 0,
    skippedManual: 0,
    // FINISHED en la API pero sin marcador todavía (free tier "scores delayed").
    // Es esperado y auto-resuelve en la próxima corrida; NO es un error.
    pendingScore: 0,
    errors: [] as string[],
  };

  for (const api of apiMatches) {
    const ours = ourByExt.get(api.id);
    if (!ours) continue;

    try {
      // ── 1+2. Horarios y cuadro KO (seguros: no afectan puntos) ──────────────
      const patch: Record<string, unknown> = {};

      const apiKickoff = new Date(api.utcDate);
      if (!Number.isNaN(apiKickoff.getTime()) && apiKickoff.getTime() !== ours.scheduledAt.getTime()) {
        patch.scheduledAt = apiKickoff;
        patch.deadlineAt = new Date(apiKickoff.getTime() - HOUR_MS); // RB-04
        summary.scheduleUpdated++;
      }

      if (ours.homeTeamId == null && api.homeTeam.id && teamByExt.has(api.homeTeam.id)) {
        patch.homeTeamId = teamByExt.get(api.homeTeam.id);
        summary.teamsFilled++;
      }
      if (ours.awayTeamId == null && api.awayTeam.id && teamByExt.has(api.awayTeam.id)) {
        patch.awayTeamId = teamByExt.get(api.awayTeam.id);
      }

      // ── 3+4. Estado, marcador en vivo y resultado ──────────────────────────
      // El override 'manual' protege el RESULTADO FINAL + puntos (la plata): el
      // sync no finaliza ni recalcula un partido que el organizador controla.
      // PERO el marcador parcial en vivo sí se espeja desde la API aunque esté
      // en manual (decisión del cliente).
      const apiStatus = mapStatus(api.status);
      const isManual = ours.resultSource === "manual";

      if (apiStatus === "finished") {
        const result = isManual ? null : mapResult(api);
        if (isManual) {
          // Resultado final bajo control del organizador → no tocar puntos.
          summary.skippedManual++;
        } else if (result) {
          const scoreChanged =
            ours.status !== "finished" ||
            ours.homeScore !== result.homeScore ||
            ours.awayScore !== result.awayScore;

          if (scoreChanged) {
            // resolver matchWinnerId a partir del lado ganador (solo si hubo prórroga)
            let matchWinnerId: string | null = null;
            if (result.winnerSide === "home") matchWinnerId = patch.homeTeamId as string ?? ours.homeTeamId;
            else if (result.winnerSide === "away") matchWinnerId = patch.awayTeamId as string ?? ours.awayTeamId;

            // primero persistimos horarios/cuadro KO pendientes
            if (Object.keys(patch).length > 0) {
              await db.update(matches).set(patch).where(eq(matches.id, ours.id));
            }
            await applyMatchResult({
              matchId: ours.id,
              tournamentId: ours.tournamentId,
              homeScore: result.homeScore,
              awayScore: result.awayScore,
              homeScoreFull: result.homeScoreFull,
              awayScoreFull: result.awayScoreFull,
              extraTime: result.extraTime,
              matchWinnerId,
              source: "auto",
            });
            await db.update(matches).set({ lastSyncedAt: now }).where(eq(matches.id, ours.id));
            summary.resultsApplied++;
            continue;
          }
        } else {
          // FINISHED sin marcador aún: no tocamos el estado (se queda como estaba)
          // y reintentamos en la próxima corrida cuando la API publique el score.
          summary.pendingScore++;
        }
      } else if (ours.status !== "finished") {
        // scheduled o live — nunca des-finalizamos un partido ya cerrado.
        // El estado solo lo movemos en partidos NO manuales (el organizador
        // controla el estado de los suyos).
        if (!isManual && apiStatus !== ours.status) {
          patch.status = apiStatus;
          summary.statusUpdated++;
        }
        // Espejar el marcador en vivo en CADA corrida (incluso en manual),
        // así el parcial se mantiene al día mientras el partido está en juego.
        if (
          apiStatus === "live" &&
          api.score.fullTime.home != null &&
          api.score.fullTime.away != null &&
          (ours.homeScore !== api.score.fullTime.home || ours.awayScore !== api.score.fullTime.away)
        ) {
          patch.homeScore = api.score.fullTime.home;
          patch.awayScore = api.score.fullTime.away;
          summary.liveScoreUpdated++;
        }
      }

      if (Object.keys(patch).length > 0) {
        patch.lastSyncedAt = now;
        await db.update(matches).set(patch).where(eq(matches.id, ours.id));
      }
    } catch (e) {
      summary.errors.push(`match ${api.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}
