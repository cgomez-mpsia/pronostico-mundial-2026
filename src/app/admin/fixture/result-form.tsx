"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  currentHomeScore: number | null;
  currentAwayScore: number | null;
  isFinished: boolean;
}

export function ResultForm({
  matchId,
  homeTeamName,
  awayTeamName,
  currentHomeScore,
  currentAwayScore,
  isFinished,
}: Props) {
  const [home, setHome] = useState(currentHomeScore ?? 0);
  const [away, setAway] = useState(currentAwayScore ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(
    isFinished ? `${currentHomeScore} — ${currentAwayScore}` : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, homeScore: home, awayScore: away }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al registrar.");
      return;
    }

    const data = await res.json();
    setResult(`${home} — ${away}`);
    setError(null);
    alert(`✓ Resultado registrado. Puntos calculados para ${data.participantCount} participantes.`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 flex-wrap">
      <span className="text-sm font-medium w-28 text-right truncate">{homeTeamName}</span>

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

      <span className="text-sm font-medium w-28 truncate">{awayTeamName}</span>

      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Calculando…" : isFinished || result ? "Corregir resultado" : "Registrar resultado"}
      </Button>

      {result && !error && (
        <span className="text-xs text-green-600 dark:text-green-400">✓ {result}</span>
      )}
      {error && (
        <Alert variant="destructive" className="mt-1 w-full">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
