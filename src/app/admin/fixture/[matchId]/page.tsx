import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { matches, teams, participants, users, predictions, tournaments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { PredictionRow } from "./prediction-row";

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
  r32: "Dieciseisavos de Final",
  r16: "Octavos de Final",
  qf: "Cuartos de Final",
  sf: "Semifinales",
  third: "Tercer Puesto",
  final: "Final",
};

export default async function AdminMatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  const homeTeamAlias = alias(teams, "home_team");
  const awayTeamAlias = alias(teams, "away_team");

  const [matchRows] = await db
    .select({
      id: matches.id,
      scheduledAt: matches.scheduledAt,
      deadlineAt: matches.deadlineAt,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      status: matches.status,
      stage: matches.stage,
      tournamentId: matches.tournamentId,
      homeTeamName: homeTeamAlias.name,
      awayTeamName: awayTeamAlias.name,
    })
    .from(matches)
    .leftJoin(homeTeamAlias, eq(matches.homeTeamId, homeTeamAlias.id))
    .leftJoin(awayTeamAlias, eq(matches.awayTeamId, awayTeamAlias.id))
    .where(eq(matches.id, matchId));

  if (!matchRows) notFound();

  const now = new Date();
  const deadlinePassed = now >= matchRows.deadlineAt;

  const rows = await db
    .select({
      participantId: participants.id,
      fullName: users.fullName,
      predHome: predictions.homeScore,
      predAway: predictions.awayScore,
      isManuallyEntered: predictions.isManuallyEntered,
    })
    .from(participants)
    .innerJoin(users, eq(participants.userId, users.id))
    .leftJoin(
      predictions,
      and(eq(predictions.participantId, participants.id), eq(predictions.matchId, matchId))
    )
    .where(eq(participants.tournamentId, matchRows.tournamentId))
    .orderBy(users.fullName);

  const submittedCount = rows.filter((r) => r.isManuallyEntered).length;

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-2xl">
      <Link href="/admin/fixture" className="text-xs text-zinc-400 hover:text-zinc-600">
        ← Volver al fixture
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          {STAGE_LABELS[matchRows.stage] ?? matchRows.stage}
        </p>
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold flex-1 text-right">
            {matchRows.homeTeamName ?? "Por definir"}
          </span>
          {matchRows.status === "finished" ? (
            <span className="text-2xl font-bold tabular-nums">
              {matchRows.homeScore} — {matchRows.awayScore}
            </span>
          ) : (
            <span className="text-sm text-zinc-400">vs</span>
          )}
          <span className="text-lg font-semibold flex-1">
            {matchRows.awayTeamName ?? "Por definir"}
          </span>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
          <span>Partido: {formatBOT(matchRows.scheduledAt)}</span>
          <span>Deadline: {formatBOT(matchRows.deadlineAt)}</span>
        </div>
      </div>

      {/* Estado del deadline */}
      {deadlinePassed ? (
        <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-800">
          El plazo cerró. Los pronósticos están en modo solo lectura.
        </div>
      ) : (
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {submittedCount} / {rows.length} participantes ingresaron pronóstico.
        </div>
      )}

      {/* Tabla de participantes */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-zinc-500">
              <th className="pb-2 pr-4 font-medium">Participante</th>
              <th className="pb-2 pr-4 font-medium text-center">Pronóstico</th>
              <th className="pb-2 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <PredictionRow
                key={r.participantId}
                matchId={matchId}
                participantId={r.participantId}
                fullName={r.fullName}
                existingHome={r.predHome ?? null}
                existingAway={r.predAway ?? null}
                deadlinePassed={deadlinePassed}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
