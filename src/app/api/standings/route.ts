import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { tournaments, participants, users, matchPoints, teams } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

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

  // Standings con RANK() para empates correctos (UC003-A2)
  const rows = await db
    .select({
      participantId: participants.id,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      hasPaid: participants.hasPaid,
      championFlagUrl: championTeam.flagUrl,
      championTeamName: championTeam.name,
      totalPoints: sql<number>`COALESCE(SUM(${matchPoints.totalPoints}), 0) + ${participants.championPoints}`.as("total_points"),
    })
    .from(participants)
    .innerJoin(users, eq(participants.userId, users.id))
    .leftJoin(matchPoints, eq(matchPoints.participantId, participants.id))
    .leftJoin(championTeam, eq(participants.championTeamId, championTeam.id))
    .where(eq(participants.tournamentId, tournament.id))
    .groupBy(participants.id, users.fullName, users.avatarUrl, participants.hasPaid, participants.championPoints, championTeam.flagUrl, championTeam.name)
    .orderBy(sql`total_points DESC`, users.fullName);

  // Calcular rank con lógica de empates en JS
  let rank = 1;
  const standings = rows.map((row, i) => {
    if (i > 0 && Number(row.totalPoints) < Number(rows[i - 1].totalPoints)) {
      rank = i + 1;
    }
    return {
      rank,
      participantId: row.participantId,
      fullName: row.fullName,
      avatarUrl: row.avatarUrl ?? null,
      championFlagUrl: row.championFlagUrl ?? null,
      championTeamName: row.championTeamName ?? null,
      hasPaid: row.hasPaid,
      totalPoints: Number(row.totalPoints),
    };
  });

  return NextResponse.json(standings);
}
