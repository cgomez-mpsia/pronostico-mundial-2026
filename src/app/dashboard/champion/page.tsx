import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { participants, tournaments, teams } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { ChampionPicker } from "./champion-picker";
import { isChampionLocked } from "@/lib/champion-lock";

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

  // Bloqueado cuando comienzan las semifinales · BR-010
  const locked = tournament ? await isChampionLocked(tournament.id) : false;

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
