import { db } from "@/db";
import { participants, users, tournaments } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { NewParticipantForm } from "./new-participant-form";

export default async function AdminParticipantsPage() {
  const tournament = await db.query.tournaments.findFirst({
    where: or(
      eq(tournaments.status, "active"),
      eq(tournaments.status, "draft")
    ),
    columns: { id: true, name: true },
  });

  const rows = tournament
    ? await db
        .select({
          participantId: participants.id,
          fullName: users.fullName,
          email: users.email,
          hasPaid: participants.hasPaid,
          joinedAt: participants.joinedAt,
        })
        .from(participants)
        .innerJoin(users, eq(participants.userId, users.id))
        .where(eq(participants.tournamentId, tournament.id))
        .orderBy(participants.joinedAt)
    : [];

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Participantes</h1>
        {tournament && (
          <p className="text-sm text-zinc-500">{tournament.name}</p>
        )}
      </div>

      <NewParticipantForm />

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-zinc-500">
                <th className="pb-2 pr-4 font-medium">Nombre</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 font-medium">Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.participantId}>
                  <td className="py-2 pr-4">{r.fullName}</td>
                  <td className="py-2 pr-4 text-zinc-500">{r.email}</td>
                  <td className="py-2">
                    {r.hasPaid ? (
                      <Badge variant="default">Pagado</Badge>
                    ) : (
                      <Badge variant="secondary">Pendiente</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 && tournament && (
        <p className="text-sm text-zinc-400">
          No hay participantes aún. Crea el primero usando el formulario.
        </p>
      )}

      {!tournament && (
        <p className="text-sm text-red-500">
          No hay un torneo activo. Crea un torneo en la base de datos para
          poder agregar participantes.
        </p>
      )}
    </div>
  );
}
