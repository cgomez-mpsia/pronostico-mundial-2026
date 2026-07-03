"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  matchId: string;
  status: string;
  stage: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeamName: string;
  awayTeamName: string;
  onUpdate: () => void;
}

export function LiveControls({
  matchId,
  status,
  stage,
  homeTeamId,
  awayTeamId,
  homeScore,
  awayScore,
  homeTeamName,
  awayTeamName,
  onUpdate,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [localHome, setLocalHome] = useState(homeScore ?? 0);
  const [localAway, setLocalAway] = useState(awayScore ?? 0);
  // Cooldown anti-spam del botón Actualizar (segundos restantes)
  const [cooldown, setCooldown] = useState(0);
  // Resolución de llave en knockout empatado a 90' · BR-057
  const [resolving, setResolving] = useState(false);
  const [extraTime, setExtraTime] = useState<"aet" | "pen" | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [homeFull, setHomeFull] = useState<string>("");
  const [awayFull, setAwayFull] = useState<string>("");

  const isKnockout = stage !== "group";
  const drawAt90 = localHome === localAway;
  const needsResolution = isKnockout && drawAt90;

  // AET: el ganador se deduce del marcador de 120' (debe haber ganador)
  // PEN: marcador de 120' libre + ganador elegido a mano
  const fullComplete = homeFull !== "" && awayFull !== "";
  const resolvedWinnerId =
    extraTime === "aet" && fullComplete && Number(homeFull) !== Number(awayFull)
      ? Number(homeFull) > Number(awayFull) ? homeTeamId : awayTeamId
      : winnerId;
  const resolutionValid =
    extraTime === "aet"
      ? fullComplete && Number(homeFull) !== Number(awayFull)
      : extraTime === "pen"
        ? fullComplete && winnerId !== null
        : false;

  // Sync when parent re-fetches and passes new props
  useEffect(() => {
    setLocalHome(homeScore ?? 0);
    setLocalAway(awayScore ?? 0);
  }, [homeScore, awayScore]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function callAction(action: string) {
    // Finalizar un knockout empatado a 90' exige indicar cómo se resolvió · BR-057
    if (action === "finish" && needsResolution && !resolving) {
      setResolving(true);
      return;
    }

    const resolution =
      action === "finish" && needsResolution
        ? {
            extraTime,
            matchWinnerId: resolvedWinnerId,
            homeScoreFull: fullComplete ? Number(homeFull) : null,
            awayScoreFull: fullComplete ? Number(awayFull) : null,
          }
        : {};

    setLoading(action);
    const res = await fetch("/api/admin/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, action, ...resolution }),
    });
    setLoading(null);

    if (!res.ok) {
      const data = await res.json();
      // Si el servidor pide esperar (throttle), arrancamos el cooldown local
      if (res.status === 429 && typeof data.retryAfter === "number") setCooldown(data.retryAfter);
      toast.error(data.error ?? "Error");
      return;
    }

    const data = await res.json();

    if (data.homeScore !== undefined) setLocalHome(data.homeScore);
    if (data.awayScore !== undefined) setLocalAway(data.awayScore);

    if (action === "start") toast.success("Partido iniciado en vivo");
    if (action === "refresh") {
      setCooldown(10);
      toast.success(`Marcador actualizado · ${data.homeScore}-${data.awayScore}`);
    }
    if (action === "finish") {
      toast.success(`Partido finalizado · ${data.participantCount} participantes calculados`);
    }

    onUpdate();
  }

  if (status === "scheduled") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-live/25 text-live hover:bg-live/15"
        onClick={() => callAction("start")}
        disabled={loading === "start"}
      >
        {loading === "start" ? "Iniciando…" : "🔴 Iniciar en vivo"}
      </Button>
    );
  }

  // status === "live"
  return (
    <div className="space-y-3">
      {/* Live score */}
      <div className="flex items-center justify-center gap-6 py-1">
        <div className="text-center min-w-0">
          <p className="text-xs text-zinc-500 truncate max-w-[72px]">{homeTeamName}</p>
          <p className="text-3xl font-bold tabular-nums text-live">{localHome}</p>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-semibold text-live animate-pulse">● EN VIVO</span>
          <span className="text-lg text-zinc-400">—</span>
        </div>
        <div className="text-center min-w-0">
          <p className="text-xs text-zinc-500 truncate max-w-[72px]">{awayTeamName}</p>
          <p className="text-3xl font-bold tabular-nums text-live">{localAway}</p>
        </div>
      </div>

      {/* Conteo manual de goles (instantáneo, sin depender de la API) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Button
            type="button"
            size="sm"
            className="w-full bg-success hover:bg-success text-success-foreground"
            onClick={() => callAction("goal_home")}
            disabled={!!loading}
          >
            {loading === "goal_home" ? "…" : "⚽ Gol Local"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="w-full text-xs text-zinc-400 hover:text-zinc-600"
            onClick={() => callAction("undo_home")}
            disabled={!!loading || localHome === 0}
          >
            ← Deshacer
          </Button>
        </div>
        <div className="space-y-1">
          <Button
            type="button"
            size="sm"
            className="w-full bg-success hover:bg-success text-success-foreground"
            onClick={() => callAction("goal_away")}
            disabled={!!loading}
          >
            {loading === "goal_away" ? "…" : "⚽ Gol Visit."}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="w-full text-xs text-zinc-400 hover:text-zinc-600"
            onClick={() => callAction("undo_away")}
            disabled={!!loading || localAway === 0}
          >
            ← Deshacer
          </Button>
        </div>
      </div>

      {/* Actualizar desde ESPN (alternativa al conteo manual) */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => callAction("refresh")}
        disabled={!!loading || cooldown > 0}
      >
        {loading === "refresh"
          ? "Actualizando…"
          : cooldown > 0
            ? `Esperá ${cooldown}s`
            : "🔄 Traer marcador de ESPN"}
      </Button>
      <p className="text-center text-[11px] text-zinc-400">
        Contá los goles a mano (instantáneo) o traé el marcador de ESPN. También se sincroniza solo cada pocos minutos.
      </p>

      {/* Resolución de llave (knockout empatado a 90') · BR-057 */}
      {resolving && needsResolution && (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="font-medium text-zinc-600 dark:text-zinc-300">
            Empate al pitido — ¿cómo se resolvió la llave?
          </p>

          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name={`live-extraTime-${matchId}`}
                checked={extraTime === "aet"}
                onChange={() => { setExtraTime("aet"); setWinnerId(null); setHomeFull(""); setAwayFull(""); }}
              />
              Tiempo extra (a.e.t.)
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name={`live-extraTime-${matchId}`}
                checked={extraTime === "pen"}
                onChange={() => { setExtraTime("pen"); setWinnerId(null); setHomeFull(""); setAwayFull(""); }}
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
                    type="number" inputMode="numeric" min={0} max={99} value={homeFull} placeholder="—"
                    onChange={(e) => setHomeFull(e.target.value)}
                    className="w-12 rounded-md border border-zinc-300 bg-white px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
                  />
                  <span className="text-zinc-400">—</span>
                  <input
                    type="number" inputMode="numeric" min={0} max={99} value={awayFull} placeholder="—"
                    onChange={(e) => setAwayFull(e.target.value)}
                    className="w-12 rounded-md border border-zinc-300 bg-white px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
                  />
                  {extraTime === "aet" && fullComplete && Number(homeFull) !== Number(awayFull) && (
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Avanza: <span className="font-medium">
                        {Number(homeFull) > Number(awayFull) ? homeTeamName : awayTeamName}
                      </span>
                    </span>
                  )}
                </div>
                {extraTime === "aet" && fullComplete && Number(homeFull) === Number(awayFull) && (
                  <p className="text-warning">
                    En AET debe haber ganador — si empató en 120 min, usa Penales.
                  </p>
                )}
              </div>

              {extraTime === "pen" && (
                <div className="space-y-1">
                  <p className="text-zinc-500 dark:text-zinc-400">Ganador en penales:</p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="radio"
                        name={`live-winner-${matchId}`}
                        checked={winnerId === homeTeamId}
                        onChange={() => setWinnerId(homeTeamId)}
                      />
                      {homeTeamName}
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="radio"
                        name={`live-winner-${matchId}`}
                        checked={winnerId === awayTeamId}
                        onChange={() => setWinnerId(awayTeamId)}
                      />
                      {awayTeamName}
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => callAction("finish")}
              disabled={!!loading || !resolutionValid}
            >
              {loading === "finish" ? "Finalizando…" : "✓ Finalizar partido"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { setResolving(false); setExtraTime(null); setWinnerId(null); setHomeFull(""); setAwayFull(""); }}
              disabled={!!loading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Finish */}
      {!resolving && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => callAction("finish")}
          disabled={!!loading}
        >
          {loading === "finish" ? "Finalizando…" : "✓ Finalizar partido"}
        </Button>
      )}
    </div>
  );
}
