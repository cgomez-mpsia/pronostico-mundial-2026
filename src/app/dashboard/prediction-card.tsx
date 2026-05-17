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
  awayTeamName: string;
  scheduledAtLabel: string;
  deadlineAtLabel: string;
  isOpen: boolean;
  matchStatus: string;
  matchHomeScore: number | null;
  matchAwayScore: number | null;
  prediction: Prediction | null;
  hasPaid: boolean;
}

export function PredictionCard({
  matchId,
  homeTeamName,
  awayTeamName,
  scheduledAtLabel,
  deadlineAtLabel,
  isOpen,
  matchStatus,
  matchHomeScore,
  matchAwayScore,
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

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Equipos */}
      <div className="flex items-center justify-between gap-4">
        <span className="flex-1 text-right text-sm font-medium">{homeTeamName}</span>

        {matchStatus === "finished" ? (
          <span className="text-lg font-bold tabular-nums">
            {matchHomeScore} — {matchAwayScore}
          </span>
        ) : isOpen ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={99}
              value={home}
              onChange={(e) => setHome(Number(e.target.value))}
              className="w-12 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800"
            />
            <span className="text-zinc-400">—</span>
            <input
              type="number"
              min={0}
              max={99}
              value={away}
              onChange={(e) => setAway(Number(e.target.value))}
              className="w-12 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
        ) : (
          <span className="text-sm text-zinc-500">
            {prediction
              ? `${prediction.homeScore} — ${prediction.awayScore}`
              : "No pronosticó"}
          </span>
        )}

        <span className="flex-1 text-left text-sm font-medium">{awayTeamName}</span>
      </div>

      {/* Info de fecha y plazo */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-zinc-400">
        <span>{scheduledAtLabel}</span>
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
