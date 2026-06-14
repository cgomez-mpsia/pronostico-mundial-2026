import { db } from "@/db";
import { tournaments, matches, teams } from "@/db/schema";
import { eq, or, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { FixtureClient } from "./fixture-client";

export default async function AdminFixturePage() {
  const tournament = await db.query.tournaments.findFirst({
    where: or(
      eq(tournaments.status, "active"),
      eq(tournaments.status, "draft")
    ),
    columns: { id: true, name: true },
  });

  if (!tournament) {
    return (
      <div className="p-8">
        <p className="text-sm text-zinc-400">No hay torneo activo.</p>
      </div>
    );
  }

  const homeTeam = alias(teams, "home_team");
  const awayTeam = alias(teams, "away_team");

  const [matchRows, allTeams] = await Promise.all([
    db
      .select({
        matchId: matches.id,
        scheduledAt: matches.scheduledAt,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        homeScoreFull: matches.homeScoreFull,
        awayScoreFull: matches.awayScoreFull,
        status: matches.status,
        stage: matches.stage,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeTeamName: homeTeam.name,
        homeTeamCode: homeTeam.code,
        homeTeamFlagUrl: homeTeam.flagUrl,
        awayTeamName: awayTeam.name,
        awayTeamCode: awayTeam.code,
        awayTeamFlagUrl: awayTeam.flagUrl,
        extraTime: matches.extraTime,
        matchWinnerId: matches.matchWinnerId,
      })
      .from(matches)
      .leftJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
      .leftJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
      .where(eq(matches.tournamentId, tournament.id))
      .orderBy(asc(matches.scheduledAt)),
    db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .orderBy(asc(teams.name)),
  ]);

  // Mismo criterio que el fixture de jugadores: un partido finalizado se queda en
  // la sección principal ~1h tras terminar (scheduledAt + 3h de gracia), luego pasa
  // a "Partidos finalizados" (más reciente primero).
  const now = new Date();
  const FINISHED_GRACE_MS = 3 * 60 * 60 * 1000;
  const toClient = (rows: typeof matchRows) =>
    rows.map((m) => ({ ...m, scheduledAt: m.scheduledAt.toISOString() }));

  const upcoming = matchRows.filter(
    (m) => m.status !== "finished" || now.getTime() < m.scheduledAt.getTime() + FINISHED_GRACE_MS
  );
  const finished = matchRows
    .filter((m) => m.status === "finished" && now.getTime() >= m.scheduledAt.getTime() + FINISHED_GRACE_MS)
    .reverse();

  return (
    <FixtureClient
      tournamentName={tournament.name}
      upcomingMatches={toClient(upcoming)}
      finishedMatches={toClient(finished)}
      teams={allTeams}
    />
  );
}
