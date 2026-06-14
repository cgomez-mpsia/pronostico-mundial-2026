import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { participants, tournaments, users, matches, predictions, matchPoints, teams } from "@/db/schema";
import { eq, or, gte, lt, and, inArray, isNull, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { fetchEspnMatches, espnDateWindow } from "@/lib/espn";

const hoyPairKey = (a?: string | null, b?: string | null) => (a && b ? [a, b].sort().join("|") : "");

function getBOTTodayBounds() {
  // BOT = UTC-4 → midnight BOT = 04:00 UTC
  const now = new Date();
  const botNow = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const y = botNow.getUTCFullYear();
  const m = botNow.getUTCMonth();
  const d = botNow.getUTCDate();
  return {
    start: new Date(Date.UTC(y, m, d, 4, 0, 0)),       // 00:00 BOT
    end: new Date(Date.UTC(y, m, d + 1, 4, 0, 0)),     // 00:00 BOT mañana
    label: new Intl.DateTimeFormat("es-BO", {
      timeZone: "America/La_Paz",
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(now),
  };
}

function formatBOTTime(date: Date) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

const STAGE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  r32: "Dieciseisavos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinales",
  third: "3er Puesto",
  final: "Final",
};

export default async function HoyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tournament = await db.query.tournaments.findFirst({
    where: or(eq(tournaments.status, "active"), eq(tournaments.status, "draft")),
    columns: { id: true },
  });

  const { start, end, label } = getBOTTodayBounds();

  if (!tournament) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-semibold capitalize">{label}</h1>
        <p className="mt-4 text-sm text-zinc-400">No hay un torneo activo.</p>
      </div>
    );
  }

  const homeTeam = alias(teams, "home_team");
  const awayTeam = alias(teams, "away_team");

  const todayMatches = await db
    .select({
      matchId: matches.id,
      scheduledAt: matches.scheduledAt,
      deadlineAt: matches.deadlineAt,
      status: matches.status,
      stage: matches.stage,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      homeScoreFull: matches.homeScoreFull,
      awayScoreFull: matches.awayScoreFull,
      extraTime: matches.extraTime,
      homeTeamName: homeTeam.name,
      homeTeamCode: homeTeam.code,
      homeTeamFlagUrl: homeTeam.flagUrl,
      awayTeamName: awayTeam.name,
      awayTeamCode: awayTeam.code,
      awayTeamFlagUrl: awayTeam.flagUrl,
    })
    .from(matches)
    .leftJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
    .leftJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
    .where(
      and(
        eq(matches.tournamentId, tournament.id),
        gte(matches.scheduledAt, start),
        lt(matches.scheduledAt, end)
      )
    )
    .orderBy(matches.scheduledAt);

  // Pronósticos y puntos de los partidos de hoy: una fila por (participante × partido)
  const matchIds = todayMatches.map((m) => m.matchId);
  const allRows = matchIds.length > 0
    ? await db
        .select({
          matchId: matches.id,
          participantId: participants.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
          userId: participants.userId,
          predHome: predictions.homeScore,
          predAway: predictions.awayScore,
          isManuallyEntered: predictions.isManuallyEntered,
          resultPoints: matchPoints.resultPoints,
          exactPoints: matchPoints.exactPoints,
          totalPoints: matchPoints.totalPoints,
        })
        .from(participants)
        .innerJoin(users, eq(participants.userId, users.id))
        // Cross-join con los partidos de hoy: genera una fila por (participante, partido)
        .innerJoin(matches, inArray(matches.id, matchIds))
        // Predicción del participante para ESE partido específico
        .leftJoin(
          predictions,
          and(
            eq(predictions.participantId, participants.id),
            eq(predictions.matchId, matches.id)
          )
        )
        // Puntos del participante en ESE partido específico
        .leftJoin(
          matchPoints,
          and(
            eq(matchPoints.participantId, participants.id),
            eq(matchPoints.matchId, matches.id)
          )
        )
        // Activos siempre; abandonados solo si ya tenían pronóstico para ESE partido (historial)
        .where(
          and(
            eq(participants.tournamentId, tournament.id),
            or(isNull(participants.abandonedAt), isNotNull(predictions.id))
          )
        )
    : [];

  // Agrupar filas por matchId
  const rowsByMatch = new Map<string, typeof allRows>();
  for (const row of allRows) {
    if (!row.matchId) continue;
    const list = rowsByMatch.get(row.matchId) ?? [];
    list.push(row);
    rowsByMatch.set(row.matchId, list);
  }

  // Resumen del día: puntos totales de hoy por participante
  const dailyTotals = new Map<string, { fullName: string; avatarUrl: string | null; userId: string; points: number; exactCount: number }>();
  for (const row of allRows) {
    if (!row.totalPoints) continue;
    const entry = dailyTotals.get(row.participantId) ?? {
      fullName: row.fullName,
      avatarUrl: row.avatarUrl,
      userId: row.userId,
      points: 0,
      exactCount: 0,
    };
    entry.points += row.totalPoints ?? 0;
    if (row.exactPoints === 2) entry.exactCount++;
    dailyTotals.set(row.participantId, entry);
  }
  const summary = Array.from(dailyTotals.values())
    .sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName));

  const hasFinished = todayMatches.some((m) => m.status === "finished");

  // Minuto de juego (ESPN) para los partidos en vivo de hoy, por par de códigos
  const liveMinuteByPair = new Map<string, string>();
  if (todayMatches.some((m) => m.status === "live")) {
    try {
      for (const e of await fetchEspnMatches(espnDateWindow(new Date()))) {
        if (e.status === "live" && e.clock) liveMinuteByPair.set(hoyPairKey(e.homeCode, e.awayCode), e.clock);
      }
    } catch {
      /* ESPN caído → "En vivo" sin minuto */
    }
  }

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Hoy</h1>
        <p className="text-sm capitalize text-zinc-500">{label}</p>
      </div>

      {todayMatches.length === 0 && (
        <p className="text-sm text-zinc-400">No hay partidos programados para hoy.</p>
      )}

      {/* Resumen del día */}
      {hasFinished && summary.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Puntos del día
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Participante</th>
                  <th className="pb-2 pr-4 text-center font-medium">Pts hoy</th>
                  <th className="pb-2 text-center font-medium">Exactos</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {summary.map((s) => (
                  <tr key={s.userId} className={s.userId === user.id ? "bg-zinc-50 dark:bg-zinc-800/50" : ""}>
                    <td className="py-2 pr-4">
                      <Link href={`/profile/${s.userId}`} className="font-medium hover:underline">
                        {s.fullName}
                      </Link>
                      {s.userId === user.id && (
                        <span className="ml-1.5 text-xs text-zinc-400">(tú)</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-center tabular-nums">
                      <span className={s.points > 0 ? "font-bold text-blue-600 dark:text-blue-400" : "text-zinc-400"}>
                        {s.points > 0 ? `+${s.points}` : "0"}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      {s.exactCount > 0 ? (
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {s.exactCount} ✓
                        </span>
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Partidos de hoy */}
      <section className="space-y-4">
        {todayMatches.length > 0 && (
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Partidos
          </h2>
        )}
        {todayMatches.map((m) => {
          const isFinished = m.status === "finished";
          const isLive = m.status === "live";
          const liveMinute = isLive ? liveMinuteByPair.get(hoyPairKey(m.homeTeamCode, m.awayTeamCode)) : null;
          const now = new Date();
          const deadlinePassed = now >= m.deadlineAt;
          const displayHome = m.extraTime && m.homeScoreFull !== null ? m.homeScoreFull : m.homeScore;
          const displayAway = m.extraTime && m.awayScoreFull !== null ? m.awayScoreFull : m.awayScore;
          const extraTimeBadge = m.extraTime === "pen" ? "pen." : m.extraTime === "aet" ? "a.e.t." : null;
          const matchRows = rowsByMatch.get(m.matchId) ?? [];
          const sortedRows = isFinished
            ? [...matchRows].sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))
            : matchRows;

          return (
            <div key={m.matchId} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              {/* Hero */}
              <div className="p-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-sm font-semibold sm:hidden">{m.homeTeamCode ?? "TBD"}</span>
                    <span className="hidden text-sm font-semibold sm:block">{m.homeTeamName ?? "Por definir"}</span>
                    {m.homeTeamFlagUrl && (
                      <img src={m.homeTeamFlagUrl} alt="" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
                    )}
                  </div>

                  {isFinished ? (
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold tabular-nums">
                        {displayHome}{" — "}{displayAway}
                      </span>
                      {extraTimeBadge && (
                        <span className="text-xs text-zinc-400">({extraTimeBadge})</span>
                      )}
                    </div>
                  ) : isLive ? (
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold tabular-nums text-red-500">
                        {m.homeScore ?? 0}{" — "}{m.awayScore ?? 0}
                      </span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold tabular-nums text-zinc-400">
                      {formatBOTTime(m.scheduledAt)}
                    </span>
                  )}

                  <div className="flex items-center justify-start gap-1.5">
                    {m.awayTeamFlagUrl && (
                      <img src={m.awayTeamFlagUrl} alt="" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
                    )}
                    <span className="text-sm font-semibold sm:hidden">{m.awayTeamCode ?? "TBD"}</span>
                    <span className="hidden text-sm font-semibold sm:block">{m.awayTeamName ?? "Por definir"}</span>
                  </div>
                </div>
                <p className="mt-1 flex items-center justify-center gap-1 text-center text-xs text-zinc-400">
                  {STAGE_LABELS[m.stage] ?? m.stage}
                  {isFinished && <> · <span className="font-medium text-zinc-500">Finalizado</span></>}
                  {isLive && (
                    <> · <span className="inline-flex items-center gap-1 font-semibold text-red-500">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                      En vivo{liveMinute ? ` · ${liveMinute}` : ""}
                    </span></>
                  )}
                </p>
              </div>

              {/* Pronósticos (solo post-deadline) */}
              {(deadlinePassed || isFinished) && sortedRows.length > 0 && (
                <>
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  <div className="overflow-x-auto px-4 pb-3 pt-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-zinc-400">
                          <th className="pb-1.5 pr-4 font-medium">Participante</th>
                          <th className="pb-1.5 pr-4 text-center font-medium">Pronóstico</th>
                          {isFinished && <th className="pb-1.5 text-right font-medium">Pts</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                        {sortedRows.map((r) => (
                          <tr
                            key={r.participantId}
                            className={r.userId === user.id ? "bg-zinc-50 dark:bg-zinc-800/40" : ""}
                          >
                            <td className="py-1.5 pr-4 font-medium">
                              <Link href={`/profile/${r.userId}`} className="hover:underline">
                                {r.fullName}
                              </Link>
                              {r.userId === user.id && (
                                <span className="ml-1 text-xs text-zinc-400">(tú)</span>
                              )}
                            </td>
                            <td className="py-1.5 pr-4 text-center tabular-nums text-zinc-500">
                              {r.isManuallyEntered
                                ? `${r.predHome} — ${r.predAway}`
                                : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                            </td>
                            {isFinished && (
                              <td className="py-1.5 text-right tabular-nums">
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Pre-deadline: contador */}
              {!deadlinePassed && !isFinished && (
                <>
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  <p className="px-4 py-2.5 text-center text-xs text-zinc-400">
                    Pronósticos ocultos hasta el cierre
                  </p>
                </>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
