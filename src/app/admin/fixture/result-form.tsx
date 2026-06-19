"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  matchId: string;
  stage: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  currentHomeScore: number | null;
  currentAwayScore: number | null;
  currentHomeScoreFull: number | null;
  currentAwayScoreFull: number | null;
  currentExtraTime: string | null;
  currentMatchWinnerId: string | null;
  isFinished: boolean;
  onSuccess?: () => void;
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
  currentHomeScoreFull,
  currentAwayScoreFull,
  currentExtraTime,
  currentMatchWinnerId,
  isFinished,
  onSuccess,
}: Props) {
  const [home, setHome] = useState<string>(
    currentHomeScore !== null ? String(currentHomeScore) : ""
  );
  const [away, setAway] = useState<string>(
    currentAwayScore !== null ? String(currentAwayScore) : ""
  );
  const [homeFull, setHomeFull] = useState<string>(
    currentHomeScoreFull !== null ? String(currentHomeScoreFull) : ""
  );
  const [awayFull, setAwayFull] = useState<string>(
    currentAwayScoreFull !== null ? String(currentAwayScoreFull) : ""
  );
  const [extraTime, setExtraTime] = useState<string | null>(currentExtraTime ?? null);
  const [matchWinnerId, setMatchWinnerId] = useState<string | null>(currentMatchWinnerId ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reopening, setReopening] = useState(false);

  const isKnockout = stage !== "group";
  const homeNum = home === "" ? null : Number(home);
  const awayNum = away === "" ? null : Number(away);
  const drawAt90 = homeNum !== null && awayNum !== null && homeNum === awayNum;
  const showExtraSection = isKnockout && drawAt90;

  // AET: 120-min score must be different (winner deduced from score)
  // PEN: 120-min score can be anything + winner must be selected
  const fullScoreComplete = homeFull !== "" && awayFull !== "";
  const aetValid =
    extraTime === "aet" &&
    fullScoreComplete &&
    Number(homeFull) !== Number(awayFull);
  const penValid =
    extraTime === "pen" &&
    fullScoreComplete &&
    matchWinnerId !== null;

  const canSubmit =
    home !== "" &&
    away !== "" &&
    (!showExtraSection || aetValid || penValid);

  function handleScoreChange(setter: (v: string) => void, value: string) {
    setter(value);
    setExtraTime(null);
    setMatchWinnerId(null);
    setHomeFull("");
    setAwayFull("");
  }

  function handleExtraTimeChange(value: string) {
    setExtraTime(value);
    setMatchWinnerId(null);
    setHomeFull("");
    setAwayFull("");
  }

  function handleCorrectClick() {
    setConfirmOpen(true);
  }

  async function handleReopen() {
    setReopening(true);
    const res = await fetch("/api/admin/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, action: "reopen" }),
    });
    setReopening(false);
    if (res.ok) onSuccess?.();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // For AET: derive winner from full score
    const resolvedWinnerId =
      extraTime === "aet"
        ? Number(homeFull) > Number(awayFull)
          ? homeTeamId
          : awayTeamId
        : matchWinnerId;

    const body: Record<string, unknown> = {
      matchId,
      homeScore: Number(home),
      awayScore: Number(away),
      homeScoreFull: showExtraSection && fullScoreComplete ? Number(homeFull) : null,
      awayScoreFull: showExtraSection && fullScoreComplete ? Number(awayFull) : null,
      extraTime: showExtraSection && extraTime ? extraTime : null,
      matchWinnerId: showExtraSection && extraTime ? resolvedWinnerId : null,
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
    toast.success(`Resultado registrado · ${data.participantCount} participantes calculados`);
    setCorrecting(false);
    onSuccess?.();
  }

  // Finished state — show correction + reopen options
  if (isFinished && !correcting) {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCorrectClick}>
            Corregir resultado
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-zinc-400 hover:text-zinc-600"
            onClick={handleReopen}
            disabled={reopening}
          >
            {reopening ? "Reabriendo…" : "Reabrir en vivo"}
          </Button>
        </div>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Corregir resultado?</AlertDialogTitle>
              <AlertDialogDescription>
                Corregir este resultado recalculará los puntos de todos los participantes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setConfirmOpen(false); setCorrecting(true); }}>
                Continuar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Score 90 min */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          value={home}
          placeholder="—"
          onChange={(e) => handleScoreChange(setHome, e.target.value)}
          onFocus={(e) => e.target.select()}
          className="w-12 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800"
        />
        <span className="text-zinc-400">—</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          value={away}
          placeholder="—"
          onChange={(e) => handleScoreChange(setAway, e.target.value)}
          onFocus={(e) => e.target.select()}
          className="w-12 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800"
        />
        {!showExtraSection && (
          <Button type="submit" size="sm" disabled={loading || !canSubmit}>
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {loading ? "Calculando…" : "Registrar resultado"}
          </Button>
        )}
        {correcting && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setCorrecting(false)}>
            Cancelar
          </Button>
        )}
      </div>

      {/* Sección AET/PEN — solo aparece en knockout con empate al 90 */}
      {showExtraSection && (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="font-medium text-zinc-600 dark:text-zinc-300">Empate al pitido — ¿cómo se resolvió?</p>

          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name={`extraTime-${matchId}`}
                value="aet"
                checked={extraTime === "aet"}
                onChange={() => handleExtraTimeChange("aet")}
              />
              Tiempo extra (a.e.t.)
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name={`extraTime-${matchId}`}
                value="pen"
                checked={extraTime === "pen"}
                onChange={() => handleExtraTimeChange("pen")}
              />
              Penales
            </label>
          </div>

          {extraTime && (
            <>
              <div className="space-y-1">
                <p className="text-zinc-500 dark:text-zinc-400">
                  Resultado a los 120 min{extraTime === "aet" ? " (debe haber ganador)" : ""}:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={99}
                    value={homeFull}
                    placeholder="—"
                    onChange={(e) => setHomeFull(e.target.value)}
                    className="w-12 rounded-md border border-zinc-300 bg-white px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
                  />
                  <span className="text-zinc-400">—</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={99}
                    value={awayFull}
                    placeholder="—"
                    onChange={(e) => setAwayFull(e.target.value)}
                    className="w-12 rounded-md border border-zinc-300 bg-white px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
                  />
                  {extraTime === "aet" && fullScoreComplete && Number(homeFull) !== Number(awayFull) && (
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Gana: <span className="font-medium">
                        {Number(homeFull) > Number(awayFull) ? homeTeamName : awayTeamName}
                      </span>
                    </span>
                  )}
                </div>
                {extraTime === "aet" && fullScoreComplete && Number(homeFull) === Number(awayFull) && (
                  <p className="text-warning">
                    En AET debe haber ganador — si empató en 120 min, usa Penales.
                  </p>
                )}
              </div>

              {/* Selector de ganador — solo para penales */}
              {extraTime === "pen" && (
                <div className="space-y-1">
                  <p className="text-zinc-500 dark:text-zinc-400">Ganador en penales:</p>
                  <div className="flex flex-wrap gap-4">
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
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={loading || !canSubmit}>
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {loading ? "Calculando…" : "Registrar resultado"}
            </Button>
            {correcting && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setCorrecting(false)}>
                Cancelar
              </Button>
            )}
          </div>
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
