"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  matchId: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeamName: string;
  awayTeamName: string;
  onUpdate: () => void;
}

export function LiveControls({
  matchId,
  status,
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
    setLoading(action);
    const res = await fetch("/api/admin/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, action }),
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
        className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
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
          <p className="text-3xl font-bold tabular-nums text-red-500">{localHome}</p>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-semibold text-red-500 animate-pulse">● EN VIVO</span>
          <span className="text-lg text-zinc-400">—</span>
        </div>
        <div className="text-center min-w-0">
          <p className="text-xs text-zinc-500 truncate max-w-[72px]">{awayTeamName}</p>
          <p className="text-3xl font-bold tabular-nums text-red-500">{localAway}</p>
        </div>
      </div>

      {/* Actualizar desde la API (reemplaza el conteo manual de goles) */}
      <Button
        type="button"
        size="sm"
        className="w-full bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600"
        onClick={() => callAction("refresh")}
        disabled={!!loading || cooldown > 0}
      >
        {loading === "refresh"
          ? "Actualizando…"
          : cooldown > 0
            ? `Esperá ${cooldown}s`
            : "🔄 Actualizar marcador"}
      </Button>
      <p className="text-center text-[11px] text-zinc-400">
        Baja el marcador en vivo de football-data.org. También se actualiza solo cada pocos minutos.
      </p>

      {/* Finish */}
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
    </div>
  );
}
