import { db } from "@/db";
import { participants, users, tournaments, teams } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { NewParticipantForm } from "./new-participant-form";
import { ParticipantsTable } from "./participants-table";

export default async function AdminParticipantsPage() {
  const tournament = await db.query.tournaments.findFirst({
    where: or(
      eq(tournaments.status, "active"),
      eq(tournaments.status, "draft")
    ),
    columns: { id: true, name: true },
  });

  const championTeam = alias(teams, "champion_team");

  const rows = tournament
    ? await db
        .select({
          participantId: participants.id,
          fullName: users.fullName,
          email: users.email,
          hasPaid: participants.hasPaid,
          joinedAt: participants.joinedAt,
          championCode: championTeam.code,
          championFlagUrl: championTeam.flagUrl,
        })
        .from(participants)
        .innerJoin(users, eq(participants.userId, users.id))
        .leftJoin(championTeam, eq(participants.championTeamId, championTeam.id))
        .where(eq(participants.tournamentId, tournament.id))
        .orderBy(users.fullName)
    : [];

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Participantes</h1>
        {tournament && (
          <p className="text-sm text-zinc-500">{tournament.name}</p>
        )}
      </div>

      <NewParticipantForm />

      {!tournament && (
        <p className="text-sm text-red-500">
          No hay un torneo activo. Crea un torneo para agregar participantes.
        </p>
      )}

      {tournament && rows.length === 0 && (
        <p className="text-sm text-zinc-400">
          No hay participantes aún. Crea el primero usando el formulario.
        </p>
      )}

      {tournament && rows.length > 0 && (
        <ParticipantsTable rows={rows} />
      )}
    </div>
  );
}
