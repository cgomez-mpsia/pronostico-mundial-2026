import { db } from "@/db";
import { tournaments, matches, teams } from "@/db/schema";
import { eq, or, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ResultForm } from "./result-form";

const STAGE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  r16: "Octavos de Final",
  qf: "Cuartos de Final",
  sf: "Semifinales",
  third: "Tercer Puesto",
  final: "Final",
};

function formatBOT(date: Date) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

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

  const matchRows = await db
    .select({
      matchId: matches.id,
      scheduledAt: matches.scheduledAt,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      status: matches.status,
      stage: matches.stage,
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
    })
    .from(matches)
    .leftJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
    .leftJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
    .where(eq(matches.tournamentId, tournament.id))
    .orderBy(asc(matches.scheduledAt));

  const byStage = new Map<string, typeof matchRows>();
  for (const m of matchRows) {
    const group = byStage.get(m.stage) ?? [];
    group.push(m);
    byStage.set(m.stage, group);
  }

  const stageOrder = ["group", "r16", "qf", "sf", "third", "final"];

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Fixture</h1>
        <p className="text-sm text-zinc-500">{tournament.name}</p>
      </div>

      {matchRows.length === 0 && (
        <p className="text-sm text-zinc-400">No hay partidos cargados aún.</p>
      )}

      {stageOrder.map((stage) => {
        const stageMatches = byStage.get(stage);
        if (!stageMatches?.length) return null;
        return (
          <section key={stage} className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              {STAGE_LABELS[stage] ?? stage}
            </h2>
            <div className="divide-y rounded-xl border border-zinc-200 dark:border-zinc-800">
              {stageMatches.map((m) => (
                <div key={m.matchId} className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>{formatBOT(m.scheduledAt)}</span>
                    {m.status === "finished" && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-500 dark:bg-zinc-800">
                        Finalizado
                      </span>
                    )}
                  </div>
                  <ResultForm
                    matchId={m.matchId}
                    homeTeamName={m.homeTeamName ?? "Por definir"}
                    awayTeamName={m.awayTeamName ?? "Por definir"}
                    currentHomeScore={m.homeScore}
                    currentAwayScore={m.awayScore}
                    isFinished={m.status === "finished"}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
