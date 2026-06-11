import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { participants, users, matches, predictions, matchPoints, teams, tournaments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";

function formatBOT(date: Date) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const homeTeamAlias = alias(teams, "home_team");
  const awayTeamAlias = alias(teams, "away_team");

  const [matchRows] = await db
    .select({
      id: matches.id,
      scheduledAt: matches.scheduledAt,
      deadlineAt: matches.deadlineAt,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      homeScoreFull: matches.homeScoreFull,
      awayScoreFull: matches.awayScoreFull,
      extraTime: matches.extraTime,
      matchWinnerId: matches.matchWinnerId,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
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
  const isFinished = matchRows.status === "finished";

  const displayHomeScore = matchRows.extraTime && matchRows.homeScoreFull !== null
    ? matchRows.homeScoreFull
    : matchRows.homeScore;
  const displayAwayScore = matchRows.extraTime && matchRows.awayScoreFull !== null
    ? matchRows.awayScoreFull
    : matchRows.awayScore;
  const extraTimeBadge = matchRows.extraTime === "pen" ? "pen." : matchRows.extraTime === "aet" ? "a.e.t." : null;
  const winnerName = matchRows.matchWinnerId
    ? matchRows.matchWinnerId === matchRows.homeTeamId
      ? (matchRows.homeTeamName ?? null)
      : (matchRows.awayTeamName ?? null)
    : null;

  // Todos los participantes del torneo con sus predicciones y puntos para este partido
  const rows = await db
    .select({
      participantId: participants.id,
      fullName: users.fullName,
      userId: participants.userId,
      predHomeScore: predictions.homeScore,
      predAwayScore: predictions.awayScore,
      isManuallyEntered: predictions.isManuallyEntered,
      resultPoints: matchPoints.resultPoints,
      exactPoints: matchPoints.exactPoints,
      totalPoints: matchPoints.totalPoints,
    })
    .from(participants)
    .innerJoin(users, eq(participants.userId, users.id))
    .leftJoin(
      predictions,
      and(eq(predictions.participantId, participants.id), eq(predictions.matchId, matchId))
    )
    .leftJoin(
      matchPoints,
      and(eq(matchPoints.participantId, participants.id), eq(matchPoints.matchId, matchId))
    )
    .where(eq(participants.tournamentId, matchRows.tournamentId))
    .orderBy(users.fullName);

  const submittedCount = rows.filter((r) => r.isManuallyEntered).length;

  // Texto para compartir por chat (disponible solo tras el deadline)
  const homeTeamLabel = matchRows.homeTeamName ?? "Local";
  const awayTeamLabel = matchRows.awayTeamName ?? "Visitante";
  const stageLabelText = STAGE_LABELS[matchRows.stage] ?? matchRows.stage;
  const matchDateText = formatBOT(matchRows.scheduledAt);
  const chatLines: string[] = [];
  if (isFinished) {
    chatLines.push(`⚽ ${homeTeamLabel} vs ${awayTeamLabel} | ${displayHomeScore}-${displayAwayScore}`);
  } else {
    chatLines.push(`⚽ ${homeTeamLabel} vs ${awayTeamLabel}`);
  }
  chatLines.push(`${stageLabelText} · ${matchDateText}`);
  chatLines.push("");
  chatLines.push("Pronósticos:");
  const sortedRows = isFinished
    ? [...rows].sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))
    : rows;
  for (const r of sortedRows) {
    const pred = r.isManuallyEntered ? `${r.predHomeScore}-${r.predAwayScore}` : "sin pronóstico";
    if (isFinished && r.totalPoints !== null) {
      const pts = r.totalPoints === 1 ? "1 pt" : `${r.totalPoints} pts`;
      chatLines.push(`${r.fullName} → ${pred} (${pts})`);
    } else {
      chatLines.push(`${r.fullName} → ${pred}`);
    }
  }
  const chatSummary = chatLines.join("\n");

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-2xl">
      {/* Back */}
      <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-zinc-600">
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
          {isFinished ? (
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold tabular-nums">
                {displayHomeScore} — {displayAwayScore}
              </span>
              {extraTimeBadge && (
                <span className="text-xs font-medium text-zinc-400">({extraTimeBadge})</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-zinc-400 tabular-nums">vs</span>
          )}
          <span className="text-lg font-semibold flex-1">
            {matchRows.awayTeamName ?? "Por definir"}
          </span>
        </div>
        {isFinished && extraTimeBadge && winnerName && (
          <p className="text-center text-sm text-zinc-500">
            Avanza: <span className="font-medium">{winnerName}</span>
          </p>
        )}
        <p className="text-sm text-zinc-500 text-center">{formatBOT(matchRows.scheduledAt)}</p>
        {isFinished && (
          <p className="text-center text-xs text-zinc-400">Partido finalizado</p>
        )}
        {deadlinePassed && (
          <div className="flex justify-center pt-1">
            <CopyButton text={chatSummary} />
          </div>
        )}
      </div>

      {/* Pre-deadline: solo contador */}
      {!deadlinePassed && !isFinished && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-2xl font-bold tabular-nums">{submittedCount} / {rows.length}</p>
          <p className="text-sm text-zinc-500">participantes enviaron su pronóstico</p>
          <p className="mt-2 text-xs text-zinc-400">
            Los pronósticos se revelan el {formatBOT(matchRows.deadlineAt)}
          </p>
        </div>
      )}

      {/* Post-deadline o finalizado: tabla completa */}
      {(deadlinePassed || isFinished) && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2 pr-4 font-medium">Participante</th>
                <th className="pb-2 pr-4 font-medium text-center">Pronóstico</th>
                {isFinished && (
                  <th className="pb-2 font-medium text-right">Pts</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows
                .sort((a, b) => {
                  if (isFinished) return (b.totalPoints ?? 0) - (a.totalPoints ?? 0);
                  return 0;
                })
                .map((r) => {
                  const isCurrentUser = r.userId === user.id;
                  const hasPred = r.isManuallyEntered;
                  return (
                    <tr
                      key={r.participantId}
                      className={isCurrentUser ? "bg-zinc-50 dark:bg-zinc-800/50" : ""}
                    >
                      <td className="py-2.5 pr-4 font-medium">
                        <Link
                          href={`/profile/${r.userId}`}
                          className="hover:underline"
                        >
                          {r.fullName}
                        </Link>
                        {isCurrentUser && (
                          <span className="ml-1.5 text-xs text-zinc-400">(tú)</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-center tabular-nums text-zinc-500">
                        {hasPred
                          ? `${r.predHomeScore} — ${r.predAwayScore}`
                          : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                      </td>
                      {isFinished && (
                        <td className="py-2.5 text-right tabular-nums">
                          {r.totalPoints != null ? (
                            <span className={
                              r.totalPoints === 3
                                ? "font-bold text-green-600 dark:text-green-400"
                                : r.totalPoints > 0
                                  ? "font-medium text-blue-600 dark:text-blue-400"
                                  : "text-zinc-400"
                            }>
                              {r.totalPoints > 0 ? `+${r.totalPoints}` : "0"}
                            </span>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-600">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
