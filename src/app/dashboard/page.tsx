import { redirect } from "next/navigation";
import Link from "next/link";
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

function getBOTDateKey(date: Date) {
  // en-CA gives YYYY-MM-DD — sortable and unique per day in BOT
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(date);
}

function getBOTDateLabel(date: Date) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

const STAGE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  r32: "Dieciseisavos de Final",
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
      extraTime: matches.extraTime,
      matchWinnerId: matches.matchWinnerId,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeTeamName: homeTeam.name,
      homeTeamFlagUrl: homeTeam.flagUrl,
      homeTeamGroupName: homeTeam.groupName,
      awayTeamName: awayTeam.name,
      awayTeamFlagUrl: awayTeam.flagUrl,
    })
    .from(matches)
    .leftJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
    .leftJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
    .where(eq(matches.tournamentId, tournament.id))
    .orderBy(asc(matches.scheduledAt));

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
    const list = byStage.get(m.stage) ?? [];
    list.push(m);
    byStage.set(m.stage, list);
  }

  const stageOrder = ["group", "r32", "r16", "qf", "sf", "third", "final"];

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <FixtureRealtime />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Fixture</h1>
          <p className="text-sm text-zinc-500">{tournament.name}</p>
        </div>
        <Link
          href="/dashboard/grupos"
          className="shrink-0 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Ver grupos →
        </Link>
      </div>

      {matchRows.length === 0 && (
        <p className="text-sm text-zinc-400">
          El fixture aún no está cargado. El admin lo publicará próximamente.
        </p>
      )}

      {stageOrder.map((stage) => {
        const stageMatches = byStage.get(stage);
        if (!stageMatches?.length) return null;

        // Agrupar por día en BOT (el orden ya viene del ORDER BY scheduledAt)
        const byDate = new Map<string, { label: string; matches: typeof stageMatches }>();
        for (const m of stageMatches) {
          const key = getBOTDateKey(m.scheduledAt);
          if (!byDate.has(key)) {
            byDate.set(key, { label: getBOTDateLabel(m.scheduledAt), matches: [] });
          }
          byDate.get(key)!.matches.push(m);
        }

        return (
          <section key={stage} className="space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              {STAGE_LABELS[stage] ?? stage}
            </h2>
            {Array.from(byDate.entries()).map(([dateKey, { label, matches: dayMatches }]) => (
              <div key={dateKey} className="space-y-3">
                <p className="border-b border-zinc-100 pb-1 text-xs font-medium capitalize text-zinc-400 dark:border-zinc-800">
                  {label}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dayMatches.map((m) => {
                    const winnerName = m.matchWinnerId
                      ? m.matchWinnerId === m.homeTeamId
                        ? (m.homeTeamName ?? null)
                        : (m.awayTeamName ?? null)
                      : null;
                    return (
                      <PredictionCard
                        key={m.matchId}
                        matchId={m.matchId}
                        homeTeamName={m.homeTeamName ?? "Por definir"}
                        homeTeamFlagUrl={m.homeTeamFlagUrl ?? null}
                        awayTeamName={m.awayTeamName ?? "Por definir"}
                        awayTeamFlagUrl={m.awayTeamFlagUrl ?? null}
                        groupLabel={m.homeTeamGroupName ? `Grupo ${m.homeTeamGroupName}` : null}
                        scheduledAtLabel={formatBOT(m.scheduledAt)}
                        deadlineAtLabel={formatBOT(m.deadlineAt)}
                        isOpen={now < m.deadlineAt && m.status === "scheduled"}
                        matchStatus={m.status}
                        matchHomeScore={m.homeScore}
                        matchAwayScore={m.awayScore}
                        extraTime={m.extraTime ?? null}
                        matchWinnerName={winnerName}
                        prediction={predMap.get(m.matchId) ?? null}
                        hasPaid={participant?.hasPaid ?? false}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
