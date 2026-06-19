import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { fetchEspnByCodes, fetchEspnSummary, type LiveSummary } from "@/lib/espn";

// Feed en vivo de un partido para el hero del dashboard: marcador, minuto,
// eventos (goles/tarjetas/cambios), estadísticas y curva de momentum.
//
// Resuelve el id de ESPN a partir del par de códigos de equipo (scoreboard) y
// luego pide el summary. Dos llamadas a ESPN por consulta — aceptable con el
// polling de ~30s del cliente y los pocos usuarios de la polla privada.

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const matchId = new URL(req.url).searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "Falta matchId" }, { status: 400 });

  const homeTeam = alias(teams, "home_team");
  const awayTeam = alias(teams, "away_team");
  const [match] = await db
    .select({
      scheduledAt: matches.scheduledAt,
      homeCode: homeTeam.code,
      awayCode: awayTeam.code,
    })
    .from(matches)
    .leftJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
    .leftJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
    .where(eq(matches.id, matchId));

  if (!match?.homeCode || !match.awayCode) {
    return NextResponse.json({ summary: null });
  }

  try {
    const scoreboard = await fetchEspnByCodes(match.homeCode, match.awayCode, match.scheduledAt);
    if (!scoreboard) return NextResponse.json({ summary: null });

    const summary = await fetchEspnSummary(scoreboard.espnId);
    if (!summary) return NextResponse.json({ summary: null });

    // El minuto/estado en vivo es más fiable en el scoreboard que en el summary.
    // El eje del gráfico usa la línea de tiempo segmentada que arma el summary
    // (consciente de periodos), así que no lo sobrescribimos con el reloj crudo.
    const merged: LiveSummary = {
      ...summary,
      clock: scoreboard.clock || summary.clock,
      status: scoreboard.status,
      homeScore: scoreboard.homeScore ?? summary.homeScore,
      awayScore: scoreboard.awayScore ?? summary.awayScore,
    };
    return NextResponse.json({ summary: merged });
  } catch {
    return NextResponse.json({ summary: null });
  }
}
