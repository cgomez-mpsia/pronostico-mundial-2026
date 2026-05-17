"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Team {
  id: string;
  name: string;
  flagUrl: string | null;
}

interface Props {
  allTeams: Team[];
  currentChampionId: string | null;
  locked: boolean;
}

export function ChampionPicker({ allTeams, currentChampionId, locked }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null); // nombre del equipo guardado
  const router = useRouter();

  const currentChampion = allTeams.find((t) => t.id === currentChampionId);
  const selectedTeam = allTeams.find((t) => t.id === selected);

  async function handleConfirm() {
    if (!selected) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/champion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: selected }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error desconocido.");
      setConfirming(false);
      return;
    }

    const data = await res.json();
    setSaved(data.teamName);
    setConfirming(false);
    setSelected(null);
    router.refresh();
  }

  if (locked) {
    return (
      <div className="space-y-3">
        <Alert>
          <AlertDescription>
            El torneo ya inició. No puedes cambiar tu elección.
          </AlertDescription>
        </Alert>
        {currentChampion ? (
          <p className="text-sm">
            Tu campeón elegido:{" "}
            <span className="font-semibold">{currentChampion.name}</span>
          </p>
        ) : (
          <p className="text-sm text-zinc-400">Sin elección — no recibirás puntos de campeón.</p>
        )}
      </div>
    );
  }

  if (confirming && selectedTeam) {
    return (
      <div className="space-y-4 max-w-sm">
        <p className="text-sm">
          ¿Confirmas que tu campeón es{" "}
          <span className="font-semibold">{selectedTeam.name}</span>? Esta
          elección será pública y no podrá cambiarse una vez iniciado el torneo.
        </p>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Guardando…" : "Confirmar"}
          </Button>
          <Button variant="outline" onClick={() => setConfirming(false)} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(saved || currentChampion) && (
        <p className="text-sm">
          Campeón actual:{" "}
          <span className="font-semibold">{saved ?? currentChampion?.name}</span>
        </p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 max-h-96 overflow-y-auto pr-1">
        {allTeams.map((team) => (
          <button
            key={team.id}
            onClick={() => setSelected(team.id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
              selected === team.id
                ? "border-zinc-900 bg-zinc-50 font-medium dark:border-zinc-100 dark:bg-zinc-800"
                : "border-zinc-200 dark:border-zinc-700"
            }`}
          >
            {team.flagUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.flagUrl} alt="" className="h-4 w-6 object-cover" />
            )}
            <span className="truncate">{team.name}</span>
          </button>
        ))}
      </div>

      <Button
        disabled={!selected}
        onClick={() => setConfirming(true)}
      >
        Elegir campeón
      </Button>
    </div>
  );
}
