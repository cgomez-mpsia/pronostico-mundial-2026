import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, participants, tournaments, teams, matches } from "@/db/schema";
import { eq, or, asc, and } from "drizzle-orm";
import { ChampionPicker } from "./champion-picker";

export default async function ChampionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tournament = await db.query.tournaments.findFirst({
    where: or(
      eq(tournaments.status, "active"),
      eq(tournaments.status, "draft")
    ),
    columns: { id: true, name: true },
  });

  const allTeams = await db
    .select({ id: teams.id, name: teams.name, flagUrl: teams.flagUrl })
    .from(teams)
    .orderBy(teams.name);

  const participant = tournament
    ? await db.query.participants.findFirst({
        where: eq(participants.userId, user.id),
        columns: { championTeamId: true, hasPaid: true },
      })
    : null;

  // Bloqueado cuando el deadline del primer partido de cuartos ya pasó
  const firstQFMatch = tournament
    ? await db.query.matches.findFirst({
        where: and(
          eq(matches.tournamentId, tournament.id),
          eq(matches.stage, "qf")
        ),
        orderBy: asc(matches.scheduledAt),
        columns: { deadlineAt: true },
      })
    : null;

  const locked = firstQFMatch?.deadlineAt
    ? firstQFMatch.deadlineAt <= new Date()
    : false;

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Mi Campeón Mundial</h1>
        {tournament && (
          <p className="text-sm text-zinc-500">{tournament.name}</p>
        )}
      </div>

      {!participant?.hasPaid && (
        <p className="text-sm text-warning">
          Tu inscripción está pendiente de confirmación de pago.
        </p>
      )}

      {allTeams.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Los equipos del torneo aún no están cargados.
        </p>
      ) : (
        <ChampionPicker
          allTeams={allTeams}
          currentChampionId={participant?.championTeamId ?? null}
          locked={locked || !participant?.hasPaid}
        />
      )}
    </div>
  );
}
