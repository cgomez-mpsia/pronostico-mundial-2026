import { db } from "@/db";
import { users, participants, tournaments, teams } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";

export async function getLayoutUserData(userId: string) {
  const [userRow, championRow, teamRows] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { fullName: true, role: true, avatarUrl: true },
    }),
    db
      .select({ flagUrl: teams.flagUrl, teamName: teams.name })
      .from(participants)
      .innerJoin(
        tournaments,
        and(
          eq(participants.tournamentId, tournaments.id),
          or(eq(tournaments.status, "active"), eq(tournaments.status, "draft"))
        )
      )
      .leftJoin(teams, eq(participants.championTeamId, teams.id))
      .where(eq(participants.userId, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    // Mapa de equipos para los toasts en vivo (el payload de Realtime trae IDs, no nombres)
    db.select({ id: teams.id, name: teams.name, code: teams.code }).from(teams),
  ]);

  const teamsMap: Record<string, { name: string; code: string }> = {};
  for (const t of teamRows) teamsMap[t.id] = { name: t.name, code: t.code };

  return {
    fullName: userRow?.fullName ?? "",
    role: userRow?.role ?? null,
    avatarUrl: userRow?.avatarUrl ?? null,
    championFlagUrl: championRow?.flagUrl ?? null,
    championTeamName: championRow?.teamName ?? null,
    teams: teamsMap,
  };
}
