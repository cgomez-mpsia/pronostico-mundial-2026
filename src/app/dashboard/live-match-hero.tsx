"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LiveSummary, LiveStatPair } from "@/lib/espn";
import { MomentumChart } from "./momentum-chart";

interface Prediction {
  homeScore: number;
  awayScore: number;
}

interface Props {
  matchId: string;
  homeTeamName: string;
  homeTeamCode: string;
  homeTeamFlagUrl: string | null;
  awayTeamName: string;
  awayTeamCode: string;
  awayTeamFlagUrl: string | null;
  stageLabel: string;
  groupLabel: string | null;
  initialHomeScore: number | null;
  initialAwayScore: number | null;
  initialClock: string | null;
  prediction: Prediction | null;
}

const POLL_MS = 30_000;

export function LiveMatchHero({
  matchId,
  homeTeamName,
  homeTeamCode,
  homeTeamFlagUrl,
  awayTeamName,
  awayTeamCode,
  awayTeamFlagUrl,
  stageLabel,
  groupLabel,
  initialHomeScore,
  initialAwayScore,
  initialClock,
  prediction,
}: Props) {
  const [summary, setSummary] = useState<LiveSummary | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/live-summary?matchId=${matchId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { summary: LiveSummary | null };
      if (!data.summary) return;
      setSummary(data.summary);
      // El partido terminó: dejamos de sondear (la página no se re-renderiza sola).
      if (data.summary.status === "finished" && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch {
      /* mantenemos el último estado conocido */
    }
  }, [matchId]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const finished = summary?.status === "finished";
  const homeScore = summary?.homeScore ?? initialHomeScore ?? 0;
  const awayScore = summary?.awayScore ?? initialAwayScore ?? 0;
  const clock = summary?.clock || initialClock || (finished ? "Final" : "En vivo");

  const goals = (summary?.events ?? []).filter((e) => e.type === "goal");

  return (
    <div
      className={
        finished
          ? "overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          : "overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm dark:border-red-900/50 dark:bg-zinc-900"
      }
    >
      {/* Cinta superior: en vivo / finalizado */}
      <div
        className={
          finished
            ? "flex items-center justify-between bg-zinc-50 px-4 py-1.5 dark:bg-zinc-800/60"
            : "flex items-center justify-between bg-red-50 px-4 py-1.5 dark:bg-red-950/40"
        }
      >
        <span className="text-xs font-medium text-zinc-500">
          {stageLabel}
          {groupLabel && ` · ${groupLabel}`}
        </span>
        {finished ? (
          <span className="text-xs font-semibold text-zinc-500">Finalizado · {clock}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            EN VIVO · {clock}
          </span>
        )}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {/* Marcador */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center justify-end gap-2.5">
            <span className="text-right text-base font-semibold sm:text-lg">{homeTeamName}</span>
            {homeTeamFlagUrl && (
              <img src={homeTeamFlagUrl} alt="" className="h-6 w-9 shrink-0 rounded object-cover shadow-sm" />
            )}
          </div>
          <span
            className={
              finished
                ? "px-1 text-3xl font-bold tabular-nums sm:text-4xl"
                : "px-1 text-3xl font-bold tabular-nums text-red-600 dark:text-red-500 sm:text-4xl"
            }
          >
            {homeScore} <span className="text-zinc-300 dark:text-zinc-600">—</span> {awayScore}
          </span>
          <div className="flex items-center justify-start gap-2.5">
            {awayTeamFlagUrl && (
              <img src={awayTeamFlagUrl} alt="" className="h-6 w-9 shrink-0 rounded object-cover shadow-sm" />
            )}
            <span className="text-base font-semibold sm:text-lg">{awayTeamName}</span>
          </div>
        </div>

        {/* Tu pronóstico + estado */}
        <PredictionBadge prediction={prediction} home={homeScore} away={awayScore} finished={finished} />

        {/* Gráfico de dinámica */}
        {summary ? (
          <MomentumChart
            momentum={summary.momentum}
            events={summary.events}
            maxMinute={summary.maxMinute}
            homeColor={summary.homeColor}
            awayColor={summary.awayColor}
            homeCode={homeTeamCode}
            awayCode={awayTeamCode}
            homeFlagUrl={homeTeamFlagUrl}
            awayFlagUrl={awayTeamFlagUrl}
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg bg-zinc-50 text-xs text-zinc-400 dark:bg-zinc-800/40">
            Cargando dinámica del partido…
          </div>
        )}

        {/* Estadísticas */}
        {summary && (summary.possession || summary.shots || summary.shotsOnTarget) && (
          <div className="space-y-2.5">
            <StatBar label="Posesión" pair={summary.possession} suffix="%" home={summary.homeColor} away={summary.awayColor} />
            <StatBar label="Tiros" pair={summary.shots} home={summary.homeColor} away={summary.awayColor} />
            <StatBar label="Tiros al arco" pair={summary.shotsOnTarget} home={summary.homeColor} away={summary.awayColor} />
          </div>
        )}

        {/* Goleadores */}
        {goals.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            {goals.map((g, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                ⚽ <span className="tabular-nums text-zinc-400">{g.minute}</span>
                <span className="font-medium text-zinc-600 dark:text-zinc-300">{g.player}</span>
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="pt-0.5">
          <Link
            href={`/dashboard/matches/${matchId}`}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70"
          >
            Ver detalle y pronósticos →
          </Link>
        </div>
      </div>
    </div>
  );
}

function PredictionBadge({
  prediction,
  home,
  away,
  finished,
}: {
  prediction: Prediction | null;
  home: number;
  away: number;
  finished: boolean;
}) {
  if (!prediction) {
    return (
      <p className="text-center text-xs text-zinc-400">Sin pronóstico para este partido</p>
    );
  }
  const suffix = finished ? "" : " (en vivo)";
  const exact = prediction.homeScore === home && prediction.awayScore === away;
  const sameOutcome = Math.sign(prediction.homeScore - prediction.awayScore) === Math.sign(home - away);
  const status = exact
    ? { text: `Pronóstico exacto${suffix}`, cls: "text-green-600 dark:text-green-400" }
    : sameOutcome
      ? { text: `${finished ? "Acertaste" : "Vas acertando"} el resultado${suffix}`, cls: "text-blue-600 dark:text-blue-400" }
      : { text: finished ? "Sin acierto" : `Por ahora, fuera${suffix}`, cls: "text-zinc-400" };

  return (
    <p className="text-center text-xs text-zinc-400">
      Tu pronóstico: <span className="font-medium tabular-nums text-zinc-600 dark:text-zinc-300">{prediction.homeScore} — {prediction.awayScore}</span>
      <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
      <span className={`font-medium ${status.cls}`}>{status.text}</span>
    </p>
  );
}

function StatBar({
  label,
  pair,
  suffix = "",
  home,
  away,
}: {
  label: string;
  pair: LiveStatPair | null;
  suffix?: string;
  home: string;
  away: string;
}) {
  if (!pair) return null;
  const total = pair.home + pair.away;
  const homePct = total > 0 ? (pair.home / total) * 100 : 50;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold tabular-nums">{pair.home}{suffix}</span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</span>
        <span className="font-semibold tabular-nums">{pair.away}{suffix}</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div style={{ width: `${homePct}%`, backgroundColor: `#${home}` }} />
        <div style={{ width: `${100 - homePct}%`, backgroundColor: `#${away}` }} />
      </div>
    </div>
  );
}
