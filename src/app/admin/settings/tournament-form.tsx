"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "draft", label: "Borrador" },
  { value: "active", label: "Activo" },
  { value: "finished", label: "Finalizado" },
];

interface Props {
  initialName: string;
  initialStatus: string;
}

export function TournamentForm({ initialName, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();

    setLoading(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/admin/tournament", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, status }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar.");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre del torneo</Label>
        <Input id="name" name="name" required defaultValue={initialName} />
      </div>

      <div className="space-y-1.5">
        <Label>Estado</Label>
        <Select value={status} onValueChange={(v) => setStatus(v ?? initialStatus)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <p className="text-sm text-success">✓ Guardado correctamente.</p>
      )}

      <Button type="submit" size="sm" disabled={loading}>
        {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        {loading ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
