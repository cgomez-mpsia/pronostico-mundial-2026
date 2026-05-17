"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STAGE_OPTIONS = [
  { value: "group", label: "Fase de Grupos" },
  { value: "r32", label: "Dieciseisavos de Final" },
  { value: "r16", label: "Octavos de Final" },
  { value: "qf", label: "Cuartos de Final" },
  { value: "sf", label: "Semifinales" },
  { value: "third", label: "Tercer Puesto" },
  { value: "final", label: "Final" },
];

const selectClass =
  "h-9 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600";

export type Team = { id: string; name: string };

interface Props {
  teams: Team[];
  matchId?: string;
  initialValues?: {
    stage: string;
    homeTeamId: string | null;
    awayTeamId: string | null;
    scheduledAtBOT: string; // "YYYY-MM-DDTHH:MM" in BOT
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function MatchForm({ teams, matchId, initialValues, onSuccess, onCancel }: Props) {
  const isEdit = Boolean(matchId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const stage = (form.elements.namedItem("stage") as HTMLSelectElement).value;
    const homeTeamId = (form.elements.namedItem("homeTeamId") as HTMLSelectElement).value || null;
    const awayTeamId = (form.elements.namedItem("awayTeamId") as HTMLSelectElement).value || null;
    const scheduledInput = (form.elements.namedItem("scheduledAt") as HTMLInputElement).value;

    if (!stage || !scheduledInput) {
      setError("Fase y fecha son requeridos.");
      return;
    }

    // Treat datetime-local input as BOT (UTC-4) → convert to UTC
    const scheduledAt = new Date(scheduledInput + ":00-04:00").toISOString();

    setLoading(true);
    setError(null);

    const url = isEdit ? `/api/admin/matches/${matchId}` : "/api/admin/matches";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, homeTeamId, awayTeamId, scheduledAt }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar.");
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold">
        {isEdit ? "Editar partido" : "Nuevo partido"}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="stage">Fase</Label>
          <select
            id="stage"
            name="stage"
            required
            defaultValue={initialValues?.stage ?? "group"}
            className={selectClass}
          >
            {STAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="scheduledAt">Fecha y hora (BOT)</Label>
          <Input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            required
            defaultValue={initialValues?.scheduledAtBOT ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="homeTeamId">Equipo local</Label>
          <select
            id="homeTeamId"
            name="homeTeamId"
            defaultValue={initialValues?.homeTeamId ?? ""}
            className={selectClass}
          >
            <option value="">Por definir</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="awayTeamId">Equipo visitante</Label>
          <select
            id="awayTeamId"
            name="awayTeamId"
            defaultValue={initialValues?.awayTeamId ?? ""}
            className={selectClass}
          >
            <option value="">Por definir</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear partido"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
