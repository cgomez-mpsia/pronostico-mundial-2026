import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { participants, users, matches, predictions, matchPoints, teams, tournaments } from "@/db/schema";
import { eq, and, or, isNull, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { fetchEspnByCodes, fetchEspnSummary, type EspnMatch, type LiveEvent } from "@/lib/espn";
import { getCappedOutUnplacedKeys, cappedOutKey } from "@/lib/standings";
import { MatchTimeline } from "./match-timeline";

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
      homeTeamCode: homeTeamAlias.code,
      homeTeamFlagUrl: homeTeamAlias.flagUrl,
      awayTeamName: awayTeamAlias.name,
      awayTeamCode: awayTeamAlias.code,
      awayTeamFlagUrl: awayTeamAlias.flagUrl,
    })
    .from(matches)
    .leftJoin(homeTeamAlias, eq(matches.homeTeamId, homeTeamAlias.id))
    .leftJoin(awayTeamAlias, eq(matches.awayTeamId, awayTeamAlias.id))
    .where(eq(matches.id, matchId));

  if (!matchRows) notFound();

  const now = new Date();
  const deadlinePassed = now >= matchRows.deadlineAt;
  const isFinished = matchRows.status === "finished";
  const isLive = matchRows.status === "live";

  // Datos en vivo de ESPN (minuto + goleadores/tarjetas) para partidos en
  // juego o finalizados; resiliente: si ESPN falla, la página igual funciona.
  let espn: EspnMatch | null = null;
  let liveEvents: LiveEvent[] = [];
  if ((isLive || isFinished) && matchRows.homeTeamCode && matchRows.awayTeamCode) {
    try {
      espn = await fetchEspnByCodes(matchRows.homeTeamCode, matchRows.awayTeamCode, matchRows.scheduledAt);
      // Eventos atribuidos a cada equipo (summary), para la línea de tiempo a dos lados.
      if (espn) {
        const summary = await fetchEspnSummary(espn.espnId);
        if (summary) liveEvents = summary.events;
      }
    } catch {
      espn = null;
    }
  }
  // Fallback: si el summary no trajo eventos, usamos las jugadas del scoreboard
  // (sin atribución de equipo) para no perder la información.
  const timeline = (espn?.plays ?? []).filter((p) => p.isGoal || p.isCard);

  // La quiniela muestra y puntúa SIEMPRE el marcador de los 90' (BR-003); la
  // prórroga/penales va en una línea informativa aparte.
  const displayHomeScore = matchRows.homeScore;
  const displayAwayScore = matchRows.awayScore;
  const knockoutNote =
    matchRows.extraTime === "aet"
      ? `Prórroga: ${matchRows.homeScoreFull ?? "?"} — ${matchRows.awayScoreFull ?? "?"}`
      : matchRows.extraTime === "pen"
        ? "Penales"
        : null;
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
    // Activos siempre; abandonados solo si ya tenían pronóstico para ESTE partido (historial)
    .where(
      and(
        eq(participants.tournamentId, matchRows.tournamentId),
        or(isNull(participants.abandonedAt), isNotNull(predictions.id))
      )
    )
    .orderBy(users.fullName);

  const submittedCount = rows.filter((r) => r.isManuallyEntered).length;

  // BR-006: puntos efectivos por participante en ESTE partido. Un empate no
  // colocado cuyo punto ya está topado en el total se muestra como 0, igual que
  // en el perfil y las posiciones.
  const cappedOut = await getCappedOutUnplacedKeys(matchRows.tournamentId);
  const effPoints = (r: { participantId: string; totalPoints: number | null }) =>
    r.totalPoints != null && cappedOut.has(cappedOutKey(r.participantId, matchId))
      ? 0
      : r.totalPoints;

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
    ? [...rows].sort((a, b) => (effPoints(b) ?? 0) - (effPoints(a) ?? 0))
    : rows;
  for (const r of sortedRows) {
    const pred = r.isManuallyEntered ? `${r.predHomeScore}-${r.predAwayScore}` : "sin pronóstico";
    if (isFinished && r.totalPoints !== null) {
      const eff = effPoints(r) ?? 0;
      const pts = eff === 1 ? "1 pt" : `${eff} pts`;
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
          <div className="flex flex-1 items-center justify-end gap-2">
            <span className="text-lg font-semibold text-right">
              {matchRows.homeTeamName ?? "Por definir"}
            </span>
            {matchRows.homeTeamFlagUrl && (
              <img src={matchRows.homeTeamFlagUrl} alt="" className="h-5 w-7 shrink-0 rounded-sm object-cover" />
            )}
          </div>
          {isFinished ? (
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold tabular-nums">
                {displayHomeScore} — {displayAwayScore}
              </span>
              {knockoutNote && (
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">90 min</span>
              )}
            </div>
          ) : isLive ? (
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold tabular-nums text-live">
                {matchRows.homeScore ?? 0} — {matchRows.awayScore ?? 0}
              </span>
              <span className="text-[10px] font-semibold uppercase text-live animate-pulse">
                ● {espn?.clock || "En vivo"}
              </span>
            </div>
          ) : (
            <span className="text-sm text-zinc-400 tabular-nums">vs</span>
          )}
          <div className="flex flex-1 items-center justify-start gap-2">
            {matchRows.awayTeamFlagUrl && (
              <img src={matchRows.awayTeamFlagUrl} alt="" className="h-5 w-7 shrink-0 rounded-sm object-cover" />
            )}
            <span className="text-lg font-semibold">
              {matchRows.awayTeamName ?? "Por definir"}
            </span>
          </div>
        </div>
        {isFinished && knockoutNote && (
          <p className="text-center text-sm text-zinc-500">
            {knockoutNote}
            {winnerName && <> · Avanza <span className="font-medium">{winnerName}</span></>}
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

      {/* Incidencias (ESPN) — línea de tiempo a dos lados, atribuida por equipo */}
      {liveEvents.length > 0 ? (
        <MatchTimeline
          events={liveEvents}
          homeCode={matchRows.homeTeamCode ?? "LOC"}
          awayCode={matchRows.awayTeamCode ?? "VIS"}
          homeFlagUrl={matchRows.homeTeamFlagUrl ?? null}
          awayFlagUrl={matchRows.awayTeamFlagUrl ?? null}
        />
      ) : (
        timeline.length > 0 && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Incidencias</h2>
            </div>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {timeline.map((p, i) => (
                <li key={i} className="flex items-center gap-2.5 px-4 py-2 text-sm">
                  <span className="w-10 shrink-0 text-right tabular-nums text-zinc-400">{p.minute}</span>
                  <span className="shrink-0">
                    {p.isGoal ? "⚽" : p.type.toLowerCase().includes("red") ? "🟥" : "🟨"}
                  </span>
                  <span className="truncate">{p.player || p.type}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      )}

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
                  if (isFinished) return (effPoints(b) ?? 0) - (effPoints(a) ?? 0);
                  return 0;
                })
                .map((r) => {
                  const isCurrentUser = r.userId === user.id;
                  const hasPred = r.isManuallyEntered;
                  const pts = effPoints(r);
                  const isCapped = r.totalPoints != null && pts === 0 && (r.totalPoints ?? 0) > 0;
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
                            <span
                              className={
                                pts === 3
                                  ? "font-bold text-success"
                                  : (pts ?? 0) > 0
                                    ? "font-medium text-info"
                                    : "text-zinc-400"
                              }
                              title={isCapped ? "No cuenta: tope de 2 pts por partidos sin pronóstico alcanzado" : undefined}
                            >
                              {(pts ?? 0) > 0 ? `+${pts}` : isCapped ? "0 (tope)" : "0"}
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
