import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { tournaments, participants, users, matchPoints, teams, matches, predictions } from "@/db/schema";
import { eq, or, sql, and, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { calculateMatchPoints } from "@/lib/points";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const tournament = await db.query.tournaments.findFirst({
    where: or(
      eq(tournaments.status, "active"),
      eq(tournaments.status, "draft")
    ),
    columns: { id: true },
  });

  if (!tournament) {
    return NextResponse.json([]);
  }

  const championTeam = alias(teams, "champion_team");
  const finishedMatch = alias(matches, "finished_match");

  // Official standings: solo puntos de partidos con status='finished'
  const rows = await db
    .select({
      participantId: participants.id,
      userId: participants.userId,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      hasPaid: participants.hasPaid,
      championFlagUrl: championTeam.flagUrl,
      championTeamName: championTeam.name,
      totalPoints: sql<number>`
        COALESCE(SUM(CASE WHEN ${finishedMatch.status} = 'finished' THEN ${matchPoints.totalPoints} ELSE 0 END), 0)
        + ${participants.championPoints}
      `.as("total_points"),
    })
    .from(participants)
    .innerJoin(users, eq(participants.userId, users.id))
    .leftJoin(matchPoints, eq(matchPoints.participantId, participants.id))
    .leftJoin(finishedMatch, eq(finishedMatch.id, matchPoints.matchId))
    .leftJoin(championTeam, eq(participants.championTeamId, championTeam.id))
    .where(and(eq(participants.tournamentId, tournament.id), isNull(participants.abandonedAt)))
    .groupBy(
      participants.id,
      participants.userId,
      users.fullName,
      users.avatarUrl,
      participants.hasPaid,
      participants.championPoints,
      championTeam.flagUrl,
      championTeam.name
    )
    .orderBy(sql`total_points DESC`, users.fullName);

  // Live hypothetical points for matches in progress
  const liveMatches = await db
    .select({ id: matches.id, homeScore: matches.homeScore, awayScore: matches.awayScore })
    .from(matches)
    .where(and(eq(matches.tournamentId, tournament.id), eq(matches.status, "live")));

  const livePointsMap = new Map<string, number>();

  if (liveMatches.length > 0) {
    const liveMatchIds = liveMatches.map((m) => m.id);

    const livePredictions = await db
      .select({
        participantId: predictions.participantId,
        matchId: predictions.matchId,
        homeScore: predictions.homeScore,
        awayScore: predictions.awayScore,
        isManuallyEntered: predictions.isManuallyEntered,
      })
      .from(predictions)
      .where(inArray(predictions.matchId, liveMatchIds));

    const predMap = new Map<string, (typeof livePredictions)[0]>();
    for (const p of livePredictions) {
      predMap.set(`${p.participantId}:${p.matchId}`, p);
    }

    for (const row of rows) {
      let pts = 0;
      for (const lm of liveMatches) {
        if (lm.homeScore === null || lm.awayScore === null) continue;
        const pred = predMap.get(`${row.participantId}:${lm.id}`) ?? null;
        pts += calculateMatchPoints(
          pred
            ? { homeScore: pred.homeScore, awayScore: pred.awayScore, isManuallyEntered: pred.isManuallyEntered }
            : null,
          { homeScore: lm.homeScore, awayScore: lm.awayScore }
        ).totalPoints;
      }
      livePointsMap.set(row.participantId, pts);
    }
  }

  const hasLive = liveMatches.length > 0;

  // Build standings array
  const standings = rows.map((row) => ({
    rank: 0,
    participantId: row.participantId,
    userId: row.userId,
    fullName: row.fullName,
    avatarUrl: row.avatarUrl ?? null,
    championFlagUrl: row.championFlagUrl ?? null,
    championTeamName: row.championTeamName ?? null,
    hasPaid: row.hasPaid,
    totalPoints: Number(row.totalPoints),
    livePoints: livePointsMap.get(row.participantId) ?? 0,
  }));

  // Sort by combined total when live
  if (hasLive) {
    standings.sort((a, b) => {
      const aDis = a.totalPoints + a.livePoints;
      const bDis = b.totalPoints + b.livePoints;
      if (bDis !== aDis) return bDis - aDis;
      return a.fullName.localeCompare(b.fullName);
    });
  }

  // Assign ranks
  let rank = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i > 0) {
      const prev = standings[i - 1].totalPoints + standings[i - 1].livePoints;
      const curr = standings[i].totalPoints + standings[i].livePoints;
      if (curr < prev) rank = i + 1;
    }
    standings[i].rank = rank;
  }

  return NextResponse.json(standings);
}
