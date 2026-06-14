import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { tournaments, matches, teams } from "@/db/schema";
import { eq, or, and, gte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

// Feed para el poller LiveUpdates: partidos en vivo + finalizados en las últimas
// ~4h (para poder detectar la transición a "final"). El polling reemplaza al
// Realtime para la entrega de actualizaciones en pantalla.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const tournament = await db.query.tournaments.findFirst({
    where: or(eq(tournaments.status, "active"), eq(tournaments.status, "draft")),
    columns: { id: true },
  });
  if (!tournament) return NextResponse.json([]);

  const homeTeam = alias(teams, "home_team");
  const awayTeam = alias(teams, "away_team");
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: matches.id,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      status: matches.status,
      scheduledAt: matches.scheduledAt,
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
    })
    .from(matches)
    .leftJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
    .leftJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
    .where(
      and(
        eq(matches.tournamentId, tournament.id),
        or(
          eq(matches.status, "live"),
          and(eq(matches.status, "finished"), gte(matches.scheduledAt, fourHoursAgo))
        )
      )
    );

  return NextResponse.json(
    rows.map((m) => ({ ...m, scheduledAt: m.scheduledAt.toISOString() }))
  );
}
