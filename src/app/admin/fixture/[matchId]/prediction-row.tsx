"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  matchId: string;
  participantId: string;
  fullName: string;
  existingHome: number | null;
  existingAway: number | null;
  deadlinePassed: boolean;
}

export function PredictionRow({
  matchId,
  participantId,
  fullName,
  existingHome,
  existingAway,
  deadlinePassed,
}: Props) {
  const router = useRouter();
  const hasPred = existingHome !== null && existingAway !== null;
  const [editing, setEditing] = useState(false);
  const [home, setHome] = useState(existingHome ?? 0);
  const [away, setAway] = useState(existingAway ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (hasPred) {
      const ok = confirm(`${fullName} ya tiene un pronóstico (${existingHome}–${existingAway}). ¿Reemplazarlo?`);
      if (!ok) return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, homeScore: home, awayScore: away, participantId }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar.");
      return;
    }

    setEditing(false);
    router.refresh();
  }

  return (
    <tr>
      <td className="py-2.5 pr-4 font-medium">{fullName}</td>
      <td className="py-2.5 pr-4 text-center tabular-nums">
        {editing ? (
          <span className="inline-flex items-center gap-1">
            <input
              type="number" min={0} max={99} value={home}
              onChange={(e) => setHome(Number(e.target.value))}
              className="w-12 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800"
            />
            <span className="text-zinc-400">—</span>
            <input
              type="number" min={0} max={99} value={away}
              onChange={(e) => setAway(Number(e.target.value))}
              className="w-12 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800"
            />
          </span>
        ) : hasPred ? (
          <span>{existingHome} — {existingAway}</span>
        ) : (
          <span className="text-zinc-400">Sin pronóstico</span>
        )}
      </td>
      <td className="py-2.5 text-right">
        {!deadlinePassed && (
          editing ? (
            <span className="inline-flex gap-1">
              <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSave} disabled={loading}>
                {loading ? "…" : "Guardar"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </span>
          ) : (
            <Button
              size="sm" variant="ghost" className="h-7 px-2 text-xs"
              onClick={() => setEditing(true)}
            >
              {hasPred ? "Modificar" : "Cargar pronóstico"}
            </Button>
          )
        )}
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </td>
    </tr>
  );
}
