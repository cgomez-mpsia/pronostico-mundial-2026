import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, matches, matchPoints, teams } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { applyMatchResult, espnDecidedInRegulation } from "@/lib/apply-result";
import { fetchEspnMatches, espnDateWindow } from "@/lib/espn";

const LIVE_ACTIONS = ["start", "goal_home", "goal_away", "undo_home", "undo_away", "finish", "reopen", "refresh"] as const;
type LiveAction = (typeof LIVE_ACTIONS)[number];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const callerRow = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });
  if (callerRow?.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const body = await request.json();
  const { matchId, action }: { matchId: string; action: LiveAction } = body;

  if (!matchId || !LIVE_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { id: true, status: true, homeScore: true, awayScore: true, tournamentId: true, homeTeamId: true, awayTeamId: true, lastSyncedAt: true, stage: true, scheduledAt: true },
  });
  if (!match) return NextResponse.json({ error: "Partido no encontrado." }, { status: 404 });

  // Bajar el marcador actual desde ESPN y escribirlo (sin finalizar ni calcular
  // puntos — eso lo hace "Finalizar partido"). Complementa el conteo manual.
  if (action === "refresh") {
    if (!match.homeTeamId || !match.awayTeamId) {
      return NextResponse.json({ error: "El partido aún no tiene equipos definidos." }, { status: 400 });
    }

    // Anti-spam: no refrescar si se actualizó hace menos de COOLDOWN_MS.
    const COOLDOWN_MS = 10_000;
    if (match.lastSyncedAt && Date.now() - match.lastSyncedAt.getTime() < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - (Date.now() - match.lastSyncedAt.getTime())) / 1000);
      return NextResponse.json(
        { error: `Recién actualizado. Esperá ${wait}s.`, retryAfter: wait },
        { status: 429 }
      );
    }

    // Códigos de equipo para matchear con ESPN
    const teamRows = await db
      .select({ id: teams.id, code: teams.code })
      .from(teams)
      .where(inArray(teams.id, [match.homeTeamId, match.awayTeamId]));
    const codeById = new Map(teamRows.map((t) => [t.id, t.code]));
    const homeCode = codeById.get(match.homeTeamId);
    const awayCode = codeById.get(match.awayTeamId);

    const now = new Date();
    const events = await fetchEspnMatches(espnDateWindow(now));
    const ev = events.find(
      (e) =>
        (e.homeCode === homeCode && e.awayCode === awayCode) ||
        (e.homeCode === awayCode && e.awayCode === homeCode)
    );
    if (!ev) {
      await db.update(matches).set({ lastSyncedAt: now }).where(eq(matches.id, matchId));
      return NextResponse.json({ error: "No se encontró el partido en ESPN (¿todavía no arrancó?)." }, { status: 404 });
    }

    // Orientar a nuestro local/visitante
    const home = ev.homeCode === homeCode ? ev.homeScore : ev.awayScore;
    const away = ev.homeCode === homeCode ? ev.awayScore : ev.homeScore;

    if (home == null || away == null) {
      await db.update(matches).set({ lastSyncedAt: now }).where(eq(matches.id, matchId));
      return NextResponse.json({ error: "ESPN aún no publica el marcador." }, { status: 409 });
    }

    // Una vez en prórroga, el marcador de ESPN incluye goles que NO cuentan para
    // los 90' (BR-003). No lo espejamos: dejaríamos el 120' como si fuera el de 90'
    // y el cierre lo registraría mal. El admin ingresa el 90' y resuelve la llave
    // a mano (prórroga/penales + ganador) al "Finalizar" · BR-057.
    if (!ev.decidedInRegulation) {
      await db.update(matches).set({ lastSyncedAt: now }).where(eq(matches.id, matchId));
      return NextResponse.json(
        {
          error:
            "El partido está en prórroga/penales. ESPN ya no da el marcador de 90'. " +
            "Dejá el marcador reglamentario y usá 'Finalizar' para resolver la llave.",
          inExtraTime: true,
        },
        { status: 409 }
      );
    }

    await db.update(matches).set({ homeScore: home, awayScore: away, lastSyncedAt: now }).where(eq(matches.id, matchId));
    return NextResponse.json({ success: true, homeScore: home, awayScore: away });
  }

  if (action === "start") {
    if (match.status !== "scheduled") {
      return NextResponse.json({ error: "Solo se puede iniciar partidos programados." }, { status: 400 });
    }
    // source='manual': el organizador controla este partido → el sync no lo toca
    await db
      .update(matches)
      .set({ status: "live", homeScore: 0, awayScore: 0, resultSource: "manual" })
      .where(eq(matches.id, matchId));
    return NextResponse.json({ success: true });
  }

  if (action === "reopen") {
    if (match.status !== "finished") {
      return NextResponse.json({ error: "Solo se puede reabrir partidos finalizados." }, { status: 400 });
    }
    // source='manual': al reabrir, el organizador toma el control → el sync no lo pisa
    await db.transaction(async (tx) => {
      await tx.delete(matchPoints).where(eq(matchPoints.matchId, matchId));
      await tx.update(matches).set({ status: "live", resultSource: "manual" }).where(eq(matches.id, matchId));
    });
    return NextResponse.json({ success: true });
  }

  if (match.status !== "live") {
    return NextResponse.json({ error: "El partido no está en vivo." }, { status: 400 });
  }

  const currentHome = match.homeScore ?? 0;
  const currentAway = match.awayScore ?? 0;

  if (action === "goal_home") {
    const newHome = currentHome + 1;
    await db.update(matches).set({ homeScore: newHome }).where(eq(matches.id, matchId));
    return NextResponse.json({ success: true, homeScore: newHome, awayScore: currentAway });
  }

  if (action === "goal_away") {
    const newAway = currentAway + 1;
    await db.update(matches).set({ awayScore: newAway }).where(eq(matches.id, matchId));
    return NextResponse.json({ success: true, homeScore: currentHome, awayScore: newAway });
  }

  if (action === "undo_home") {
    const newHome = Math.max(0, currentHome - 1);
    await db.update(matches).set({ homeScore: newHome }).where(eq(matches.id, matchId));
    return NextResponse.json({ success: true, homeScore: newHome, awayScore: currentAway });
  }

  if (action === "undo_away") {
    const newAway = Math.max(0, currentAway - 1);
    await db.update(matches).set({ awayScore: newAway }).where(eq(matches.id, matchId));
    return NextResponse.json({ success: true, homeScore: currentHome, awayScore: newAway });
  }

  if (action === "finish") {
    // En knockout con empate a 90', el organizador debe indicar cómo se resolvió
    // la llave (prórroga/penales + ganador) — el +1 del clasificado depende de
    // esto · BR-057. En grupos (o knockout con ganador a 90') se finaliza directo.
    const { extraTime, matchWinnerId, homeScoreFull, awayScoreFull } = body as {
      extraTime?: "aet" | "pen" | null;
      matchWinnerId?: string | null;
      homeScoreFull?: number | null;
      awayScoreFull?: number | null;
    };

    const isKnockout = match.stage !== "group";
    const drawAt90 = currentHome === currentAway;

    if (isKnockout && drawAt90) {
      if (!extraTime || !["aet", "pen"].includes(extraTime)) {
        return NextResponse.json(
          { error: "Empate a los 90': indica cómo se resolvió (prórroga o penales).", needsResolution: true },
          { status: 400 }
        );
      }
      if (!matchWinnerId || (matchWinnerId !== match.homeTeamId && matchWinnerId !== match.awayTeamId)) {
        return NextResponse.json({ error: "Debes indicar el equipo que avanza." }, { status: 400 });
      }
      if (typeof homeScoreFull !== "number" || typeof awayScoreFull !== "number") {
        return NextResponse.json({ error: "Se requiere el marcador a los 120 min." }, { status: 400 });
      }
    } else if (extraTime || matchWinnerId) {
      return NextResponse.json({ error: "Prórroga/ganador solo aplican a eliminatorias empatadas a 90'." }, { status: 400 });
    }

    const withResolution = isKnockout && drawAt90;

    // Red de seguridad: si vamos a cerrar una eliminatoria como resultado liso de
    // 90' (sin resolución de llave) pero ESPN reporta que fue a prórroga/penales,
    // el marcador que tenemos incluye goles que NO cuentan (BR-003). No cerramos:
    // el organizador debe ingresar el 90' y la resolución a mano (Resultados).
    if (isKnockout && !withResolution) {
      const decided = await espnDecidedInRegulation(match.homeTeamId, match.awayTeamId, match.scheduledAt);
      if (decided === false) {
        return NextResponse.json(
          {
            error:
              "ESPN reporta que este partido fue a prórroga/penales. El marcador en vivo " +
              "incluye goles de la prórroga, que no cuentan para los 90'. Ingresá el marcador " +
              "de los 90' y la resolución de la llave desde 'Resultados'.",
            inExtraTime: true,
          },
          { status: 409 }
        );
      }
    }

    const participantCount = await applyMatchResult({
      matchId,
      tournamentId: match.tournamentId,
      homeScore: currentHome,
      awayScore: currentAway,
      homeScoreFull: withResolution ? homeScoreFull : null,
      awayScoreFull: withResolution ? awayScoreFull : null,
      extraTime: withResolution ? extraTime : null,
      matchWinnerId: withResolution ? matchWinnerId : null,
      source: "manual",
    });

    return NextResponse.json({ success: true, participantCount });
  }

  return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
}
