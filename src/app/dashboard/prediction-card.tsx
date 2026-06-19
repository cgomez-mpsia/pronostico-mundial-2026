"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  scheduledTimeLabel: string;
  deadlineAtLabel: string;
  isOpen: boolean;
  matchStatus: string;
  matchHomeScore: number | null;
  matchAwayScore: number | null;
  matchHomeScoreFull: number | null;
  matchAwayScoreFull: number | null;
  extraTime: string | null;
  matchWinnerName: string | null;
  liveMinute?: string | null;
  prediction: Prediction | null;
  hasPaid: boolean;
}

export function PredictionCard({
  matchId,
  homeTeamName,
  homeTeamCode,
  homeTeamFlagUrl,
  awayTeamName,
  awayTeamCode,
  awayTeamFlagUrl,
  stageLabel,
  groupLabel,
  scheduledTimeLabel,
  deadlineAtLabel,
  isOpen,
  matchStatus,
  matchHomeScore,
  matchAwayScore,
  matchHomeScoreFull,
  matchAwayScoreFull,
  extraTime,
  matchWinnerName,
  liveMinute,
  prediction,
  hasPaid,
}: Props) {
  const [home, setHome] = useState(prediction?.homeScore ?? 0);
  const [away, setAway] = useState(prediction?.awayScore ?? 0);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [savedPrediction, setSavedPrediction] = useState<{ home: number; away: number } | null>(
    prediction ? { home: prediction.homeScore, away: prediction.awayScore } : null
  );
  const [error, setError] = useState<string | null>(null);
  const justSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincronizar inputs y pronóstico guardado cuando el prop cambia (re-render del servidor)
  useEffect(() => {
    setHome(prediction?.homeScore ?? 0);
    setAway(prediction?.awayScore ?? 0);
    setSavedPrediction(prediction ? { home: prediction.homeScore, away: prediction.awayScore } : null);
  }, [prediction?.homeScore, prediction?.awayScore]);

  async function handleSave() {
    setSaving(true);
    setJustSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, homeScore: home, awayScore: away }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al guardar.");
        return;
      }

      setSavedPrediction({ home, away });
      if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current);
      setJustSaved(true);
      justSavedTimerRef.current = setTimeout(() => setJustSaved(false), 3000);
    } catch {
      setError("Sin conexión. Verifica tu red e intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const isFinished = matchStatus === "finished";
  const isLive = matchStatus === "live";
  const extraTimeBadge = extraTime === "pen" ? "pen." : extraTime === "aet" ? "a.e.t." : null;

  const displayHomeScore = extraTime && matchHomeScoreFull !== null ? matchHomeScoreFull : matchHomeScore;
  const displayAwayScore = extraTime && matchAwayScoreFull !== null ? matchAwayScoreFull : matchAwayScore;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">

      {/* ── Fila 1: Equipos + hora/score ── */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">

        {/* Local: nombre → bandera */}
        <div className="flex items-center justify-end gap-1.5">
          <span className="text-sm font-semibold sm:hidden">{homeTeamCode}</span>
          <span className="hidden text-sm font-semibold sm:block">{homeTeamName}</span>
          {homeTeamFlagUrl && (
            <img src={homeTeamFlagUrl} alt="" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
          )}
        </div>

        {/* Centro: siempre hora o score — NUNCA inputs */}
        {isFinished ? (
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold tabular-nums">
              {displayHomeScore}{" — "}{displayAwayScore}
            </span>
            {extraTimeBadge && (
              <span className="text-xs text-zinc-400">({extraTimeBadge})</span>
            )}
          </div>
        ) : isLive ? (
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold tabular-nums text-live">
              {matchHomeScore ?? 0}{" — "}{matchAwayScore ?? 0}
            </span>
          </div>
        ) : (
          <span className="text-2xl font-bold tabular-nums text-zinc-400">
            {scheduledTimeLabel}
          </span>
        )}

        {/* Visitante: bandera → nombre */}
        <div className="flex items-center justify-start gap-1.5">
          {awayTeamFlagUrl && (
            <img src={awayTeamFlagUrl} alt="" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
          )}
          <span className="text-sm font-semibold sm:hidden">{awayTeamCode}</span>
          <span className="hidden text-sm font-semibold sm:block">{awayTeamName}</span>
        </div>
      </div>

      {/* Equipo que avanza (solo eliminatorias AET/PEN) */}
      {isFinished && extraTimeBadge && matchWinnerName && (
        <p className="mt-1 text-center text-xs text-zinc-500">
          Avanza: <span className="font-medium">{matchWinnerName}</span>
        </p>
      )}

      {/* ── Fila 2: Meta — etapa · grupo · deadline / Finalizado / En vivo ── */}
      <p className="mt-1.5 flex items-center justify-center gap-1 text-center text-xs text-zinc-400">
        {stageLabel}
        {groupLabel && <> · {groupLabel}</>}
        {isFinished ? (
          <> · <span className="font-medium text-zinc-500">Finalizado</span></>
        ) : isLive ? (
          <> · <span className="inline-flex items-center gap-1 font-semibold text-live">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
            En vivo{liveMinute ? ` · ${liveMinute}` : ""}
          </span></>
        ) : isOpen ? (
          <> · Cierra: {deadlineAtLabel}</>
        ) : null}
      </p>

      {/* ── Pronóstico del usuario (partido cerrado o finalizado) ── */}
      {(!isOpen || isFinished) && (
        <p className="mt-1 text-center text-xs text-zinc-400">
          {savedPrediction
            ? <>Tu pronóstico: <span className="font-medium tabular-nums">{savedPrediction.home} — {savedPrediction.away}</span></>
            : "Sin pronóstico"}
        </p>
      )}

      {/* ── Sección de acción: separador + inputs + botón ── */}
      {isOpen && (
        <>
          <div className="my-3 border-t border-zinc-100 dark:border-zinc-800" />

          {hasPaid ? (
            <div className="flex flex-col items-center gap-2.5">
              {/* Inputs de pronóstico */}
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  value={home}
                  disabled={saving}
                  onChange={(e) => setHome(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-14 rounded-lg border border-zinc-300 bg-zinc-50 px-2 py-1.5 text-center text-lg font-semibold tabular-nums dark:border-zinc-600 dark:bg-zinc-800 disabled:opacity-50"
                />
                <span className="text-zinc-400 font-semibold">—</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  value={away}
                  disabled={saving}
                  onChange={(e) => setAway(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-14 rounded-lg border border-zinc-300 bg-zinc-50 px-2 py-1.5 text-center text-lg font-semibold tabular-nums dark:border-zinc-600 dark:bg-zinc-800 disabled:opacity-50"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-live">{error}</p>
              )}

              {/* Botón + confirmación */}
              <div className="flex items-center gap-2">
                {justSaved && (
                  <span className="text-xs text-success">✓ Guardado</span>
                )}
                {!justSaved && savedPrediction && (
                  <span className="text-xs text-success">
                    ✓ {savedPrediction.home} — {savedPrediction.away}
                  </span>
                )}
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {saving ? "Guardando…" : "Guardar pronóstico"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-warning">
              Pago pendiente — no puedes ingresar pronósticos.
            </p>
          )}
        </>
      )}

      {/* Link a detalle */}
      {!isOpen && (
        <div className="mt-2.5 text-center">
          <Link
            href={`/dashboard/matches/${matchId}`}
            className={
              isLive
                ? "inline-block rounded-lg bg-live/10 px-3 py-1.5 text-xs font-semibold text-live hover:bg-live/15"
                : "text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }
          >
            {isLive ? "Seguir en vivo · goles →" : isFinished ? "Ver detalle y pronósticos →" : "Ver pronósticos →"}
          </Link>
        </div>
      )}
    </div>
  );
}
