"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type Team = { id: string; name: string };

interface Props {
  teams: Team[];
  applied: boolean;
  appliedAt: string | null;
}

export function ChampionForm({ teams, applied, appliedAt }: Props) {
  const router = useRouter();
  const [winnerTeamId, setWinnerTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function applyPoints() {
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
    toast.success(`Puntos aplicados a ${data.winnersCount} participante(s).`);
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!winnerTeamId) {
      setError("Selecciona el equipo campeón.");
      return;
    }
    setError(null);
    setConfirmOpen(true);
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
      <div className="rounded-xl border border-success/25 bg-success/10 p-4">
        <p className="text-sm font-medium text-success">
          ✓ Puntos de campeón ya aplicados
        </p>
        {date && (
          <p className="mt-0.5 text-xs text-success">{date}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div className="space-y-1.5">
          <Label>Equipo campeón del mundo</Label>
          <Select value={winnerTeamId} onValueChange={(v) => setWinnerTeamId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar equipo…" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" size="sm" disabled={loading}>
          {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {loading ? "Aplicando…" : "Aplicar +5 puntos al campeón"}
        </Button>
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aplicar puntos de campeón?</AlertDialogTitle>
            <AlertDialogDescription>
              Se otorgarán +5 puntos a todos los participantes que eligieron este campeón. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={applyPoints} disabled={loading}>
              {loading ? "Aplicando…" : "Aplicar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
