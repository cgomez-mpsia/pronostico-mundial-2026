import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { matches, teams, participants, users, predictions, matchPoints } from "@/db/schema";
import { eq, and, or, isNull, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { PredictionRow } from "./prediction-row";
import { CopyButton } from "@/components/copy-button";
import { getCappedOutUnplacedKeys, cappedOutKey } from "@/lib/standings";
import { stageHasQualifier } from "@/lib/points";

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
      homeTeamCode: homeTeamAlias.code,
      awayTeamName: awayTeamAlias.name,
      awayTeamCode: awayTeamAlias.code,
    })
    .from(matches)
    .leftJoin(homeTeamAlias, eq(matches.homeTeamId, homeTeamAlias.id))
    .leftJoin(awayTeamAlias, eq(matches.awayTeamId, awayTeamAlias.id))
    .where(eq(matches.id, matchId));

  if (!matchRows) notFound();

  const now = new Date();
  const deadlinePassed = now >= matchRows.deadlineAt;

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

  const rows = await db
    .select({
      participantId: participants.id,
      fullName: users.fullName,
      predHome: predictions.homeScore,
      predAway: predictions.awayScore,
      predQualifierTeamId: predictions.qualifierTeamId,
      isManuallyEntered: predictions.isManuallyEntered,
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
    // Activos siempre; abandonados solo si ya tenían pronóstico para ESTE partido (historial)
    .where(
      and(
        eq(participants.tournamentId, matchRows.tournamentId),
        or(isNull(participants.abandonedAt), isNotNull(predictions.id))
      )
    )
    .orderBy(users.fullName);

  const submittedCount = rows.filter((r) => r.isManuallyEntered).length;
  const isFinished = matchRows.status === "finished";

  // BR-057: desde octavos el pronóstico incluye al clasificado
  const hasQualifier = stageHasQualifier(matchRows.stage);
  const qualifierCode = (id: string | null) =>
    id == null
      ? null
      : id === matchRows.homeTeamId
        ? (matchRows.homeTeamCode ?? null)
        : id === matchRows.awayTeamId
          ? (matchRows.awayTeamCode ?? null)
          : null;

  // BR-006: puntos efectivos (un no colocado topado cuenta como 0).
  const cappedOut = await getCappedOutUnplacedKeys(matchRows.tournamentId);
  const effPoints = (r: { participantId: string; totalPoints: number | null }) =>
    r.totalPoints != null && cappedOut.has(cappedOutKey(r.participantId, matchId))
      ? 0
      : r.totalPoints;

  // Texto para compartir por chat
  const home = matchRows.homeTeamName ?? "Local";
  const away = matchRows.awayTeamName ?? "Visitante";
  const stageLine = STAGE_LABELS[matchRows.stage] ?? matchRows.stage;
  const dateLine = formatBOT(matchRows.scheduledAt);
  const summaryLines: string[] = [];
  if (isFinished) {
    summaryLines.push(`⚽ ${home} vs ${away} | ${displayHomeScore}-${displayAwayScore}`);
  } else {
    summaryLines.push(`⚽ ${home} vs ${away}`);
  }
  summaryLines.push(`${stageLine} · ${dateLine}`);
  summaryLines.push("");
  if (!deadlinePassed) {
    summaryLines.push(`${submittedCount}/${rows.length} participantes enviaron su pronóstico`);
  } else {
    summaryLines.push("Pronósticos:");
    const sorted = isFinished
      ? [...rows].sort((a, b) => (effPoints(b) ?? 0) - (effPoints(a) ?? 0))
      : rows;
    for (const r of sorted) {
      // BR-057: en knockout el resumen incluye a quién eligió como clasificado
      const qualPick = hasQualifier && r.isManuallyEntered ? qualifierCode(r.predQualifierTeamId) : null;
      const pred = r.isManuallyEntered
        ? `${r.predHome}-${r.predAway}${qualPick ? ` (pasa ${qualPick})` : ""}`
        : "sin pronóstico";
      if (isFinished && r.totalPoints !== null) {
        const eff = effPoints(r) ?? 0;
        const pts = eff === 1 ? "1 pt" : `${eff} pts`;
        summaryLines.push(`${r.fullName} → ${pred} (${pts})`);
      } else {
        summaryLines.push(`${r.fullName} → ${pred}`);
      }
    }
  }
  const summaryText = summaryLines.join("\n");

  // Texto para reportar por WhatsApp a quienes NO ingresaron pronóstico.
  // BR-057: en knockout también cuenta como pendiente quien puso marcador pero
  // aún no eligió al clasificado (pronóstico pre-regla).
  const missingRows = rows.filter((r) => !r.isManuallyEntered);
  const missingQualifierRows = hasQualifier
    ? rows.filter((r) => r.isManuallyEntered && !r.predQualifierTeamId)
    : [];
  const missingLines: string[] = [];
  missingLines.push(`⚽ ${home} vs ${away}`);
  missingLines.push(`${stageLine} · ${dateLine}`);
  missingLines.push("");
  if (missingRows.length > 0) {
    missingLines.push(`Faltan pronosticar (${missingRows.length}/${rows.length}):`);
    for (const r of missingRows) {
      missingLines.push(`• ${r.fullName}`);
    }
  }
  if (missingQualifierRows.length > 0) {
    if (missingRows.length > 0) missingLines.push("");
    // Solo nombres: este texto se comparte ANTES del partido — no revelar marcadores
    missingLines.push(`Les falta elegir quién pasa (${missingQualifierRows.length}):`);
    for (const r of missingQualifierRows) {
      missingLines.push(`• ${r.fullName}`);
    }
  }
  const missingText = missingLines.join("\n");

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
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold tabular-nums">
                {displayHomeScore} — {displayAwayScore}
              </span>
              {extraTimeBadge && (
                <span className="text-xs font-medium text-zinc-400">({extraTimeBadge})</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-zinc-400">vs</span>
          )}
          <span className="text-lg font-semibold flex-1">
            {matchRows.awayTeamName ?? "Por definir"}
          </span>
        </div>
        {matchRows.status === "finished" && extraTimeBadge && winnerName && (
          <p className="text-center text-sm text-zinc-500">
            Avanza: <span className="font-medium">{winnerName}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
          <span>Partido: {formatBOT(matchRows.scheduledAt)}</span>
          <span>Deadline: {formatBOT(matchRows.deadlineAt)}</span>
          <CopyButton text={summaryText} />
          {missingRows.length + missingQualifierRows.length > 0 && (
            <CopyButton text={missingText} label={`Copiar faltantes (${missingRows.length + missingQualifierRows.length})`} />
          )}
        </div>
      </div>

      {/* Estado del deadline */}
      {deadlinePassed ? (
        <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-800">
          El plazo cerró. Los pronósticos están en modo solo lectura.
        </div>
      ) : (
        <div className="rounded-lg bg-info/10 px-3 py-2 text-sm text-info">
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
                requiresQualifier={stageHasQualifier(matchRows.stage)}
                existingQualifierTeamId={r.predQualifierTeamId ?? null}
                homeTeamId={matchRows.homeTeamId}
                homeTeamCode={matchRows.homeTeamCode}
                awayTeamId={matchRows.awayTeamId}
                awayTeamCode={matchRows.awayTeamCode}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
