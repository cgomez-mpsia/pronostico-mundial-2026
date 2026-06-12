import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { participants, tournaments, teams, matches, predictions } from "@/db/schema";
import { eq, or, asc, and } from "drizzle-orm";
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
    hour12: false,
  }).format(date);
}

function formatBOTTime(date: Date) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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

  const participant = tournament
    ? await db.query.participants.findFirst({
        where: and(eq(participants.userId, user.id), eq(participants.tournamentId, tournament.id)),
        columns: { id: true, hasPaid: true, championTeamId: true },
      })
    : undefined;

  const homeTeam = alias(teams, "home_team");
  const awayTeam = alias(teams, "away_team");

  const matchRows = await db
    .select({
      matchId: matches.id,
      scheduledAt: matches.scheduledAt,
      deadlineAt: matches.deadlineAt,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      homeScoreFull: matches.homeScoreFull,
      awayScoreFull: matches.awayScoreFull,
      status: matches.status,
      stage: matches.stage,
      extraTime: matches.extraTime,
      matchWinnerId: matches.matchWinnerId,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeTeamName: homeTeam.name,
      homeTeamCode: homeTeam.code,
      homeTeamFlagUrl: homeTeam.flagUrl,
      homeTeamGroupName: homeTeam.groupName,
      awayTeamName: awayTeam.name,
      awayTeamCode: awayTeam.code,
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

  const stageOrder = ["group", "r32", "r16", "qf", "sf", "third", "final"];

  // Un partido finalizado se queda en la sección principal ~1 hora después de que termina.
  // Como no hay finishedAt, usamos scheduledAt + 3h (90 min partido + 30 min buffer + 1h gracia).
  const FINISHED_GRACE_MS = 3 * 60 * 60 * 1000;
  const upcomingRows = matchRows.filter(
    (m) => m.status !== "finished" || now.getTime() < m.scheduledAt.getTime() + FINISHED_GRACE_MS
  );
  const finishedRows = matchRows
    .filter((m) => m.status === "finished" && now.getTime() >= m.scheduledAt.getTime() + FINISHED_GRACE_MS)
    .reverse();

  function buildStageGroups(rows: typeof matchRows) {
    const byStage = new Map<string, typeof matchRows>();
    for (const m of rows) {
      const list = byStage.get(m.stage) ?? [];
      list.push(m);
      byStage.set(m.stage, list);
    }
    return byStage;
  }

  function renderStageGroups(rows: typeof matchRows) {
    const byStage = buildStageGroups(rows);
    return stageOrder.map((stage) => {
      const stageMatches = byStage.get(stage);
      if (!stageMatches?.length) return null;

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
              <div className="grid gap-3 sm:grid-cols-2">
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
                      homeTeamCode={m.homeTeamCode ?? "TBD"}
                      homeTeamFlagUrl={m.homeTeamFlagUrl ?? null}
                      awayTeamName={m.awayTeamName ?? "Por definir"}
                      awayTeamCode={m.awayTeamCode ?? "TBD"}
                      awayTeamFlagUrl={m.awayTeamFlagUrl ?? null}
                      stageLabel={STAGE_LABELS[m.stage] ?? m.stage}
                      groupLabel={m.homeTeamGroupName ? `Grupo ${m.homeTeamGroupName}` : null}
                      scheduledTimeLabel={formatBOTTime(m.scheduledAt)}
                      deadlineAtLabel={formatBOT(m.deadlineAt)}
                      isOpen={now < m.deadlineAt && m.status === "scheduled"}
                      matchStatus={m.status}
                      matchHomeScore={m.homeScore}
                      matchAwayScore={m.awayScore}
                      matchHomeScoreFull={m.homeScoreFull ?? null}
                      matchAwayScoreFull={m.awayScoreFull ?? null}
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
    });
  }

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

      {upcomingRows.length > 0 && renderStageGroups(upcomingRows)}

      {finishedRows.length > 0 && (
        <div className="space-y-8 border-t border-zinc-100 pt-8 dark:border-zinc-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Partidos finalizados
          </h2>
          {renderStageGroups(finishedRows)}
        </div>
      )}
    </div>
  );
}
