"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Prediction {
  homeScore: number;
  awayScore: number;
}

interface Props {
  matchId: string;
  homeTeamName: string;
  homeTeamFlagUrl: string | null;
  awayTeamName: string;
  awayTeamFlagUrl: string | null;
  groupLabel: string | null;
  scheduledAtLabel: string;
  deadlineAtLabel: string;
  isOpen: boolean;
  matchStatus: string;
  matchHomeScore: number | null;
  matchAwayScore: number | null;
  extraTime: string | null;
  matchWinnerName: string | null;
  prediction: Prediction | null;
  hasPaid: boolean;
}

export function PredictionCard({
  matchId,
  homeTeamName,
  homeTeamFlagUrl,
  awayTeamName,
  awayTeamFlagUrl,
  groupLabel,
  scheduledAtLabel,
  deadlineAtLabel,
  isOpen,
  matchStatus,
  matchHomeScore,
  matchAwayScore,
  extraTime,
  matchWinnerName,
  prediction,
  hasPaid,
}: Props) {
  const [home, setHome] = useState(prediction?.homeScore ?? 0);
  const [away, setAway] = useState(prediction?.awayScore ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, homeScore: home, awayScore: away }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const extraTimeBadge =
    extraTime === "pen" ? "pen." : extraTime === "aet" ? "a.e.t." : null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Equipos con banderas */}
      <div className="flex items-center gap-2">
        {/* Local */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
          <span className="truncate text-sm font-medium">{homeTeamName}</span>
          {homeTeamFlagUrl && (
            <img
              src={homeTeamFlagUrl}
              alt=""
              className="h-4 w-6 shrink-0 rounded-sm object-cover"
            />
          )}
        </div>

        {/* Score / inputs */}
        {matchStatus === "finished" ? (
          <div className="flex shrink-0 flex-col items-center">
            <span className="text-lg font-bold tabular-nums">
              {matchHomeScore} — {matchAwayScore}
            </span>
            {extraTimeBadge && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                {extraTimeBadge}
              </span>
            )}
          </div>
        ) : isOpen ? (
          <div className="flex shrink-0 items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={home}
              onChange={(e) => setHome(Number(e.target.value))}
              className="w-12 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800"
            />
            <span className="text-zinc-400">—</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={away}
              onChange={(e) => setAway(Number(e.target.value))}
              className="w-12 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
        ) : (
          <span className="shrink-0 text-sm text-zinc-500">
            {prediction
              ? `${prediction.homeScore} — ${prediction.awayScore}`
              : "—"}
          </span>
        )}

        {/* Visitante */}
        <div className="flex min-w-0 flex-1 items-center justify-start gap-1.5">
          {awayTeamFlagUrl && (
            <img
              src={awayTeamFlagUrl}
              alt=""
              className="h-4 w-6 shrink-0 rounded-sm object-cover"
            />
          )}
          <span className="truncate text-sm font-medium">{awayTeamName}</span>
        </div>
      </div>

      {/* Ganador en eliminatoria (cuando hay a.e.t. o pen.) */}
      {matchStatus === "finished" && extraTimeBadge && matchWinnerName && (
        <p className="mt-1 text-center text-[11px] text-zinc-500">
          Avanza: <span className="font-medium">{matchWinnerName}</span>
        </p>
      )}

      {/* Info de fecha, plazo y grupo */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-zinc-400">
        <span>
          {groupLabel && <span className="mr-1 font-medium">{groupLabel} ·</span>}
          {scheduledAtLabel}
        </span>
        {matchStatus === "scheduled" && (
          <span>Cierra: {deadlineAtLabel}</span>
        )}
        {matchStatus === "finished" && (
          <span className="font-medium text-zinc-500">Finalizado</span>
        )}
      </div>

      {/* Acción */}
      {isOpen && hasPaid && (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar pronóstico"}
          </Button>
          {saved && (
            <span className="text-xs text-green-600 dark:text-green-400">
              ✓ Guardado
            </span>
          )}
          {error && (
            <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
          )}
        </div>
      )}

      {isOpen && !hasPaid && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Pago pendiente — no puedes ingresar pronósticos.
        </p>
      )}

      {/* Link a detalle post-deadline */}
      {!isOpen && (
        <div className="mt-2">
          <Link
            href={`/dashboard/matches/${matchId}`}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Ver pronósticos →
          </Link>
        </div>
      )}
    </div>
  );
}
