import { db } from "@/db";
import { tournaments, teams } from "@/db/schema";
import { eq, or, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { TournamentForm } from "./tournament-form";
import { ChampionForm } from "./champion-form";
import { Separator } from "@/components/ui/separator";

export default async function AdminSettingsPage() {
  const tournament = await db.query.tournaments.findFirst({
    where: or(
      eq(tournaments.status, "draft"),
      eq(tournaments.status, "active"),
      eq(tournaments.status, "finished")
    ),
    columns: {
      id: true,
      name: true,
      status: true,
      championApplied: true,
      championAppliedAt: true,
    },
  });

  if (!tournament) notFound();

  const allTeams = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .orderBy(asc(teams.name));

  return (
    <div className="space-y-10 p-6 lg:p-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-zinc-500">{tournament.name}</p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Torneo</h2>
          <p className="text-sm text-zinc-500">Nombre y estado del torneo.</p>
        </div>
        <TournamentForm
          initialName={tournament.name}
          initialStatus={tournament.status}
        />
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Campeón Mundial</h2>
          <p className="text-sm text-zinc-500">
            Aplica +5 puntos a los participantes que acertaron el campeón. Solo se puede hacer una vez.
          </p>
        </div>
        <ChampionForm
          teams={allTeams}
          applied={tournament.championApplied}
          appliedAt={tournament.championAppliedAt?.toISOString() ?? null}
        />
      </section>
    </div>
  );
}
