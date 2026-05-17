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
        status: matches.status,
        stage: matches.stage,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeTeamName: homeTeam.name,
        awayTeamName: awayTeam.name,
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

  return (
    <FixtureClient
      tournamentName={tournament.name}
      matches={matchRows.map((m) => ({
        ...m,
        scheduledAt: m.scheduledAt.toISOString(),
      }))}
      teams={allTeams}
    />
  );
}
