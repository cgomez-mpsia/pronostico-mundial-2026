"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  matchId: string;
  stage: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  currentHomeScore: number | null;
  currentAwayScore: number | null;
  currentExtraTime: string | null;
  currentMatchWinnerId: string | null;
  isFinished: boolean;
}

export function ResultForm({
  matchId,
  stage,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  currentHomeScore,
  currentAwayScore,
  currentExtraTime,
  currentMatchWinnerId,
  isFinished,
}: Props) {
  const [home, setHome] = useState(currentHomeScore ?? 0);
  const [away, setAway] = useState(currentAwayScore ?? 0);
  const [extraTime, setExtraTime] = useState<string | null>(currentExtraTime ?? null);
  const [matchWinnerId, setMatchWinnerId] = useState<string | null>(currentMatchWinnerId ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(
    isFinished ? `${currentHomeScore} — ${currentAwayScore}` : null
  );

  const isKnockout = stage !== "group";
  const showExtraTime = isKnockout && home === away;

  function handleScoreChange(setter: (v: number) => void, value: number) {
    setter(value);
    setExtraTime(null);
    setMatchWinnerId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (showExtraTime && !extraTime) {
      setError("Debes indicar cómo se decidió el partido.");
      return;
    }
    if (showExtraTime && extraTime && !matchWinnerId) {
      setError("Debes indicar el equipo ganador.");
      return;
    }

    setLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      matchId,
      homeScore: home,
      awayScore: away,
      extraTime: showExtraTime && extraTime ? extraTime : null,
      matchWinnerId: showExtraTime && extraTime ? matchWinnerId : null,
    };

    const res = await fetch("/api/admin/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-28 truncate text-right text-sm font-medium">{homeTeamName}</span>

        <input
          type="number"
          min={0}
          max={99}
          value={home}
          onChange={(e) => handleScoreChange(setHome, Number(e.target.value))}
          className="w-12 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800"
        />
        <span className="text-zinc-400">—</span>
        <input
          type="number"
          min={0}
          max={99}
          value={away}
          onChange={(e) => handleScoreChange(setAway, Number(e.target.value))}
          className="w-12 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800"
        />

        <span className="w-28 truncate text-sm font-medium">{awayTeamName}</span>

        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Calculando…" : isFinished || result ? "Corregir resultado" : "Registrar resultado"}
        </Button>

        {result && !error && (
          <span className="text-xs text-green-600 dark:text-green-400">✓ {result}</span>
        )}
      </div>

      {showExtraTime && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-800/50">
          <span className="font-medium text-zinc-600 dark:text-zinc-400">¿Cómo se decidió?</span>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name={`extraTime-${matchId}`}
              value="aet"
              checked={extraTime === "aet"}
              onChange={() => { setExtraTime("aet"); setMatchWinnerId(null); }}
            />
            Tiempo extra
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name={`extraTime-${matchId}`}
              value="pen"
              checked={extraTime === "pen"}
              onChange={() => { setExtraTime("pen"); setMatchWinnerId(null); }}
            />
            Penales
          </label>

          {extraTime && (
            <>
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Ganador:</span>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name={`winner-${matchId}`}
                  value={homeTeamId ?? ""}
                  checked={matchWinnerId === homeTeamId}
                  onChange={() => setMatchWinnerId(homeTeamId)}
                />
                {homeTeamName}
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name={`winner-${matchId}`}
                  value={awayTeamId ?? ""}
                  checked={matchWinnerId === awayTeamId}
                  onChange={() => setMatchWinnerId(awayTeamId)}
                />
                {awayTeamName}
              </label>
            </>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="w-full">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
