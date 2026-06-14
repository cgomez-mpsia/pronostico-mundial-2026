// Sync automático de partidos desde ESPN · cron
//
// Lo dispara un scheduler externo (mismo patrón que match-reminders) con el
// header x-cron-secret. En días de partido conviene cada ~1-2 min.
//
// Qué automatiza (matcheando por par de códigos de equipo, 48/48 == ESPN):
//   1. Horarios   → actualiza scheduledAt y recalcula deadlineAt (-1h) · RB-04
//   2. Estado     → scheduled / live / finished
//   3. En vivo    → espeja el marcador parcial (incluso en partidos manuales)
//   4. Resultados → al finished escribe el marcador y recalcula puntos
//
// Override del organizador: el sync NUNCA finaliza ni recalcula un partido con
// resultSource='manual' (lo controla el admin), pero sí espeja su parcial en vivo.
//
// Nota: ESPN da el marcador final del partido. Para fase de grupos eso es el de
// 90' (no hay prórroga). En eliminatorias con prórroga/penales el marcador a 90'
// lo resuelve el organizador a mano (BR-005); por eso el sync no auto-finaliza
// partidos que el admin haya puesto en manual.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, teams, tournaments } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { applyMatchResult } from "@/lib/apply-result";
import { fetchEspnMatches, espnDateWindow, type EspnMatch } from "@/lib/espn";

const HOUR_MS = 60 * 60 * 1000;

// Clave de par de equipos, sin importar local/visitante
const pairKey = (a: string, b: string) => [a, b].sort().join("|");

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

  // Nuestros partidos del torneo, con los códigos de equipo (para matchear con ESPN)
  const homeTeam = alias(teams, "home_team");
  const awayTeam = alias(teams, "away_team");
  const ourMatches = await db
    .select({
      id: matches.id,
      status: matches.status,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      scheduledAt: matches.scheduledAt,
      resultSource: matches.resultSource,
      tournamentId: matches.tournamentId,
      homeCode: homeTeam.code,
      awayCode: awayTeam.code,
    })
    .from(matches)
    .leftJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
    .leftJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
    .where(eq(matches.tournamentId, tournament.id));

  // Indexamos por par de códigos (solo partidos con ambos equipos definidos)
  const ourByPair = new Map<string, (typeof ourMatches)[number]>();
  for (const m of ourMatches) {
    if (m.homeCode && m.awayCode) ourByPair.set(pairKey(m.homeCode, m.awayCode), m);
  }

  const now = new Date();
  const espnMatches = await fetchEspnMatches(espnDateWindow(now));

  const summary = {
    scheduleUpdated: 0,
    statusUpdated: 0,
    liveScoreUpdated: 0,
    resultsApplied: 0,
    skippedManual: 0,
    pendingScore: 0,
    errors: [] as string[],
  };

  for (const ev of espnMatches) {
    const ours = ourByPair.get(pairKey(ev.homeCode, ev.awayCode));
    if (!ours) continue;

    try {
      // Orientar el marcador de ESPN a NUESTRO local/visitante
      const oriented = orientScore(ev, ours.homeCode!);
      const isManual = ours.resultSource === "manual";
      const patch: Record<string, unknown> = {};

      // ── 1. Horario ──────────────────────────────────────────────────────────
      const kickoff = new Date(ev.date);
      if (!isManual && !Number.isNaN(kickoff.getTime()) && kickoff.getTime() !== ours.scheduledAt.getTime()) {
        patch.scheduledAt = kickoff;
        patch.deadlineAt = new Date(kickoff.getTime() - HOUR_MS); // RB-04
        summary.scheduleUpdated++;
      }

      // ── 2+3+4. Estado, parcial en vivo y resultado ──────────────────────────
      if (ev.status === "finished") {
        if (isManual) {
          summary.skippedManual++;
        } else if (oriented.home != null && oriented.away != null) {
          const changed =
            ours.status !== "finished" ||
            ours.homeScore !== oriented.home ||
            ours.awayScore !== oriented.away;
          if (changed) {
            if (Object.keys(patch).length > 0) {
              await db.update(matches).set(patch).where(eq(matches.id, ours.id));
            }
            await applyMatchResult({
              matchId: ours.id,
              tournamentId: ours.tournamentId,
              homeScore: oriented.home,
              awayScore: oriented.away,
              source: "auto",
            });
            await db.update(matches).set({ lastSyncedAt: now }).where(eq(matches.id, ours.id));
            summary.resultsApplied++;
            continue;
          }
        } else {
          summary.pendingScore++;
        }
      } else if (ours.status !== "finished") {
        // scheduled o live — nunca des-finalizamos un partido cerrado
        if (!isManual && ev.status !== ours.status) {
          patch.status = ev.status;
          summary.statusUpdated++;
        }
        // Espejar el parcial en vivo en cada corrida (incluso en manual)
        if (
          ev.status === "live" &&
          oriented.home != null &&
          oriented.away != null &&
          (ours.homeScore !== oriented.home || ours.awayScore !== oriented.away)
        ) {
          patch.homeScore = oriented.home;
          patch.awayScore = oriented.away;
          summary.liveScoreUpdated++;
        }
      }

      if (Object.keys(patch).length > 0) {
        patch.lastSyncedAt = now;
        await db.update(matches).set(patch).where(eq(matches.id, ours.id));
      }
    } catch (e) {
      summary.errors.push(`${ev.homeCode}-${ev.awayCode}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ ok: true, source: "espn", ...summary });
}

/** Devuelve el marcador de ESPN orientado a nuestro local/visitante. */
function orientScore(ev: EspnMatch, ourHomeCode: string): { home: number | null; away: number | null } {
  if (ev.homeCode === ourHomeCode) return { home: ev.homeScore, away: ev.awayScore };
  return { home: ev.awayScore, away: ev.homeScore }; // ESPN al revés que nosotros
}
