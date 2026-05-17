"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const selectClass =
  "h-9 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600";

type Team = { id: string; name: string };

interface Props {
  teams: Team[];
  applied: boolean;
  appliedAt: string | null;
}

export function ChampionForm({ teams, applied, appliedAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const winnerTeamId = (form.elements.namedItem("winnerTeamId") as HTMLSelectElement).value;

    if (!winnerTeamId) {
      setError("Selecciona el equipo campeón.");
      return;
    }

    if (!confirm("¿Aplicar +5 puntos a los participantes que eligieron este campeón? Esta acción no se puede deshacer.")) {
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/champion-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winnerTeamId }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al aplicar puntos.");
      return;
    }

    const data = await res.json();
    setSuccess(true);
    alert(`✓ Puntos aplicados a ${data.winnersCount} participante(s).`);
    router.refresh();
  }

  if (applied) {
    const date = appliedAt
      ? new Intl.DateTimeFormat("es-BO", {
          timeZone: "America/La_Paz",
          dateStyle: "long",
          timeStyle: "short",
        }).format(new Date(appliedAt))
      : null;
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          ✓ Puntos de campeón ya aplicados
        </p>
        {date && (
          <p className="mt-0.5 text-xs text-green-700 dark:text-green-400">{date}</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div className="space-y-1.5">
        <Label htmlFor="winnerTeamId">Equipo campeón del mundo</Label>
        <select
          id="winnerTeamId"
          name="winnerTeamId"
          className={selectClass}
          defaultValue=""
        >
          <option value="" disabled>Seleccionar equipo…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400">✓ Puntos aplicados correctamente.</p>
      )}

      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Aplicando…" : "Aplicar +5 puntos al campeón"}
      </Button>
    </form>
  );
}
