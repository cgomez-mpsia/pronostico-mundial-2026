"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  participantId: string;
  fullName: string;
  existingHome: number | null;
  existingAway: number | null;
  deadlinePassed: boolean;
  // BR-057: etapas desde octavos exigen elegir al clasificado
  requiresQualifier?: boolean;
  existingQualifierTeamId?: string | null;
  homeTeamId?: string | null;
  homeTeamCode?: string | null;
  awayTeamId?: string | null;
  awayTeamCode?: string | null;
}

export function PredictionRow({
  matchId,
  participantId,
  fullName,
  existingHome,
  existingAway,
  deadlinePassed,
  requiresQualifier = false,
  existingQualifierTeamId = null,
  homeTeamId = null,
  homeTeamCode = null,
  awayTeamId = null,
  awayTeamCode = null,
}: Props) {
  const router = useRouter();
  const hasPred = existingHome !== null && existingAway !== null;
  const [editing, setEditing] = useState(false);
  const [home, setHome] = useState(existingHome ?? 0);
  const [away, setAway] = useState(existingAway ?? 0);
  const [qualifier, setQualifier] = useState<string | null>(existingQualifierTeamId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const qualifierMissing = requiresQualifier && qualifier == null;
  const qualifierCode = (id: string | null) =>
    id === homeTeamId ? homeTeamCode : id === awayTeamId ? awayTeamCode : null;

  async function performSave() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId,
        homeScore: home,
        awayScore: away,
        participantId,
        ...(requiresQualifier ? { qualifierTeamId: qualifier } : {}),
      }),
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

  function handleSave() {
    if (hasPred) {
      setConfirmOpen(true);
    } else {
      performSave();
    }
  }

  return (
    <>
      <tr>
        <td className="py-2.5 pr-4 font-medium">{fullName}</td>
        <td className="py-2.5 pr-4 text-center tabular-nums">
          {editing ? (
            <span className="inline-flex flex-col items-center gap-1.5">
              <span className="inline-flex items-center gap-1">
                <input
                  type="number" min={0} max={99} value={home}
                  disabled={loading}
                  onChange={(e) => setHome(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-12 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800 disabled:opacity-50"
                />
                <span className="text-zinc-400">—</span>
                <input
                  type="number" min={0} max={99} value={away}
                  disabled={loading}
                  onChange={(e) => setAway(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-12 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-center text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800 disabled:opacity-50"
                />
              </span>
              {/* Clasificado (obligatorio desde octavos) · BR-057 */}
              {requiresQualifier && (
                <span className="inline-flex items-center gap-1">
                  {[
                    { id: homeTeamId, code: homeTeamCode },
                    { id: awayTeamId, code: awayTeamCode },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={loading}
                      onClick={() => setQualifier(t.id)}
                      className={
                        "rounded-md border px-2 py-0.5 text-xs font-semibold disabled:opacity-50 " +
                        (qualifier === t.id
                          ? "border-success bg-success/10 text-success"
                          : "border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400")
                      }
                    >
                      {t.code}
                    </button>
                  ))}
                </span>
              )}
            </span>
          ) : hasPred ? (
            <span>
              {existingHome} — {existingAway}
              {requiresQualifier && (
                existingQualifierTeamId ? (
                  <span className="ml-1.5 text-xs text-zinc-400">
                    → {qualifierCode(existingQualifierTeamId)}
                  </span>
                ) : (
                  <span className="ml-1.5 text-xs text-warning" title="Falta elegir al clasificado">
                    sin clasificado
                  </span>
                )
              )}
            </span>
          ) : (
            <span className="text-zinc-400">Sin pronóstico</span>
          )}
        </td>
        <td className="py-2.5 text-right">
          {editing ? (
            <span className="inline-flex flex-col items-end gap-1">
              <span className="inline-flex gap-1">
                <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSave} disabled={loading || qualifierMissing}>
                  {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  {loading ? "Guardando…" : "Guardar"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={loading} onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              </span>
              {deadlinePassed && (
                <span className="text-[10px] text-warning">fuera de plazo</span>
              )}
            </span>
          ) : (
            <Button
              size="sm" variant="ghost" className="h-7 px-2 text-xs"
              onClick={() => setEditing(true)}
            >
              {hasPred ? "Modificar" : "Cargar pronóstico"}
            </Button>
          )}
          {error && <p className="text-xs text-live mt-0.5">{error}</p>}
        </td>
      </tr>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reemplazar pronóstico?</AlertDialogTitle>
            <AlertDialogDescription>
              {fullName} ya tiene un pronóstico registrado ({existingHome}–{existingAway}). ¿Deseas reemplazarlo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmOpen(false); performSave(); }}>
              Reemplazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
