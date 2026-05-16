import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { tournaments, participants, users, matchPoints } from "@/db/schema";
import { eq, or, sum, sql } from "drizzle-orm";

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

  // Standings con RANK() para empates correctos (UC003-A2)
  const rows = await db
    .select({
      participantId: participants.id,
      fullName: users.fullName,
      totalPoints: sql<number>`COALESCE(SUM(${matchPoints.totalPoints}), 0)`.as("total_points"),
    })
    .from(participants)
    .innerJoin(users, eq(participants.userId, users.id))
    .leftJoin(matchPoints, eq(matchPoints.participantId, participants.id))
    .where(eq(participants.tournamentId, tournament.id))
    .groupBy(participants.id, users.fullName)
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
      totalPoints: Number(row.totalPoints),
    };
  });

  return NextResponse.json(standings);
}
