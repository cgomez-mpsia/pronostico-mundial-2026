import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { participants, tournaments, teams, matches, predictions } from "@/db/schema";
import { eq, or, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { PredictionCard } from "./prediction-card";
import { FixtureRealtime } from "./fixture-realtime";

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

const STAGE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  r16: "Octavos de Final",
  qf: "Cuartos de Final",
  sf: "Semifinales",
  third: "Tercer Puesto",
  final: "Final",
};

export default async function DashboardPage() {
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

  if (!tournament) {
    return (
      <div className="p-8">
        <p className="text-sm text-zinc-400">No hay un torneo activo.</p>
      </div>
    );
  }

  const participant = await db.query.participants.findFirst({
    where: eq(participants.userId, user.id),
    columns: { id: true, hasPaid: true, championTeamId: true },
  });

  // Fixture con nombres de equipos (alias para home/away)
  const homeTeam = alias(teams, "home_team");
  const awayTeam = alias(teams, "away_team");

  const matchRows = await db
    .select({
      matchId: matches.id,
      scheduledAt: matches.scheduledAt,
      deadlineAt: matches.deadlineAt,
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

  // Predicciones del usuario
  const userPredictions = participant
    ? await db
        .select({
          matchId: predictions.matchId,
          homeScore: predictions.homeScore,
          awayScore: predictions.awayScore,
        })
        .from(predictions)
        .where(eq(predictions.participantId, participant.id))
    : [];

  const predMap = new Map(userPredictions.map((p) => [p.matchId, p]));

  const now = new Date();

  // Agrupar por etapa
  const byStage = new Map<string, typeof matchRows>();
  for (const m of matchRows) {
    const group = byStage.get(m.stage) ?? [];
    group.push(m);
    byStage.set(m.stage, group);
  }

  const stageOrder = ["group", "r16", "qf", "sf", "third", "final"];

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <FixtureRealtime />
      <div>
        <h1 className="text-2xl font-semibold">Fixture</h1>
        <p className="text-sm text-zinc-500">{tournament.name}</p>
      </div>

      {matchRows.length === 0 && (
        <p className="text-sm text-zinc-400">
          El fixture aún no está cargado. El admin lo publicará próximamente.
        </p>
      )}

      {stageOrder.map((stage) => {
        const stageMatches = byStage.get(stage);
        if (!stageMatches?.length) return null;
        return (
          <section key={stage} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              {STAGE_LABELS[stage] ?? stage}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stageMatches.map((m) => (
                <PredictionCard
                  key={m.matchId}
                  matchId={m.matchId}
                  homeTeamName={m.homeTeamName ?? "Por definir"}
                  awayTeamName={m.awayTeamName ?? "Por definir"}
                  scheduledAtLabel={formatBOT(m.scheduledAt)}
                  deadlineAtLabel={formatBOT(m.deadlineAt)}
                  isOpen={now < m.deadlineAt && m.status === "scheduled"}
                  matchStatus={m.status}
                  matchHomeScore={m.homeScore}
                  matchAwayScore={m.awayScore}
                  prediction={predMap.get(m.matchId) ?? null}
                  hasPaid={participant?.hasPaid ?? false}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
