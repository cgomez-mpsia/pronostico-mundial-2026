"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export type ParticipantRow = {
  participantId: string;
  fullName: string;
  email: string;
  hasPaid: boolean;
  joinedAt: Date;
  championCode: string | null;
  championFlagUrl: string | null;
};

type SortKey = "name" | "pago" | "fecha";
type SortDir = "asc" | "desc";

interface Props {
  rows: ParticipantRow[];
}

export function ParticipantsTable({ rows }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "pending">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Payment toggle confirm dialog
  const [pendingPayment, setPendingPayment] = useState<{
    participantId: string;
    hasPaid: boolean;
    fullName: string;
  } | null>(null);

  // Password reset dialog
  const [resetTarget, setResetTarget] = useState<{
    participantId: string;
    fullName: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = rows.filter((r) => (filter === "pending" ? !r.hasPaid : true));

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") {
      cmp = a.fullName.localeCompare(b.fullName, "es");
    } else if (sortKey === "pago") {
      cmp = Number(b.hasPaid) - Number(a.hasPaid);
    } else if (sortKey === "fecha") {
      cmp = a.joinedAt.getTime() - b.joinedAt.getTime();
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  async function confirmTogglePayment() {
    if (!pendingPayment) return;
    const { participantId, hasPaid, fullName } = pendingPayment;

    setLoadingId(participantId);
    const res = await fetch(`/api/admin/participants/${participantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasPaid: !hasPaid }),
    });
    setLoadingId(null);
    setPendingPayment(null);

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Error al actualizar.");
      return;
    }

    toast.success(`Pago actualizado para ${fullName}.`);
    router.refresh();
  }

  async function submitPasswordReset() {
    if (!resetTarget) return;
    const { participantId, fullName } = resetTarget;

    if (newPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setPasswordError(null);
    setResetting(true);
    const res = await fetch(`/api/admin/participants/${participantId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setResetting(false);

    if (!res.ok) {
      const data = await res.json();
      setPasswordError(data.error ?? "Error al cambiar la contraseña.");
      return;
    }

    toast.success(`Contraseña actualizada para ${fullName}.`);
    setResetTarget(null);
    setNewPassword("");
  }

  function openResetDialog(participantId: string, fullName: string) {
    setResetTarget({ participantId, fullName });
    setNewPassword("");
    setPasswordError(null);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="ml-1 inline h-3.5 w-3.5 text-zinc-400" />;
    return sortDir === "asc"
      ? <ChevronUp className="ml-1 inline h-3.5 w-3.5" />
      : <ChevronDown className="ml-1 inline h-3.5 w-3.5" />;
  }

  const paid = rows.filter((r) => r.hasPaid).length;

  return (
    <>
      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            {paid} pagados · {rows.length - paid} pendientes · {rows.length} total
          </p>
          <Select value={filter} onValueChange={(v) => setFilter(v as "all" | "pending")}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Solo pendientes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("name")}
                >
                  Nombre <SortIcon col="name" />
                </TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("pago")}
                >
                  Pago <SortIcon col="pago" />
                </TableHead>
                <TableHead className="hidden md:table-cell">Campeón</TableHead>
                <TableHead
                  className="hidden lg:table-cell cursor-pointer select-none"
                  onClick={() => toggleSort("fecha")}
                >
                  Inscripción <SortIcon col="fecha" />
                </TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-zinc-400">
                    No hay participantes {filter === "pending" ? "con pago pendiente" : "aún"}.
                  </TableCell>
                </TableRow>
              )}
              {sorted.map((r) => (
                <TableRow key={r.participantId} className={loadingId === r.participantId ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{r.fullName}</TableCell>
                  <TableCell className="hidden sm:table-cell text-zinc-500 text-sm">{r.email}</TableCell>
                  <TableCell>
                    {r.hasPaid ? (
                      <Badge variant="default" className="text-xs">Pagado</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {r.championCode ? (
                      <div className="flex items-center gap-1.5">
                        {r.championFlagUrl && (
                          <img src={r.championFlagUrl} alt="" className="h-3.5 w-5 rounded-sm object-cover" />
                        )}
                        <span className="text-sm font-mono">{r.championCode}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-400 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-zinc-500">
                    {new Intl.DateTimeFormat("es-BO", {
                      timeZone: "America/La_Paz",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(r.joinedAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Acciones</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setPendingPayment({ participantId: r.participantId, hasPaid: r.hasPaid, fullName: r.fullName })}
                        >
                          {r.hasPaid ? "Marcar como pendiente" : "Confirmar pago"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openResetDialog(r.participantId, r.fullName)}
                        >
                          Resetear contraseña
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Payment toggle confirm dialog */}
      <AlertDialog open={pendingPayment !== null} onOpenChange={(open) => { if (!open) setPendingPayment(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingPayment?.hasPaid ? "¿Marcar como pendiente?" : "¿Confirmar pago?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPayment?.hasPaid
                ? `Se marcará el pago de ${pendingPayment?.fullName} como pendiente.`
                : `Se confirmará el pago de ${pendingPayment?.fullName}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTogglePayment}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password reset dialog */}
      <Dialog
        open={resetTarget !== null}
        onOpenChange={(open) => { if (!open) { setResetTarget(null); setNewPassword(""); setPasswordError(null); } }}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Resetear contraseña</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">
              Nueva contraseña para {resetTarget?.fullName}
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }}
              placeholder="Mínimo 8 caracteres"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitPasswordReset(); } }}
            />
            {passwordError && (
              <p className="text-xs text-red-500">{passwordError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setResetTarget(null); setNewPassword(""); setPasswordError(null); }}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={submitPasswordReset} disabled={resetting}>
              {resetting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {resetting ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
