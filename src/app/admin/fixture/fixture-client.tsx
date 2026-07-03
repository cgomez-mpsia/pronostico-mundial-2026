"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ResultForm } from "./result-form";
import { LiveControls } from "./live-controls";
import { MatchForm, type Team } from "./match-form";

const STAGE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  r32: "Dieciseisavos de Final",
  r16: "Octavos de Final",
  qf: "Cuartos de Final",
  sf: "Semifinales",
  third: "Tercer Puesto",
  final: "Final",
};

const STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "third", "final"];

export type MatchRow = {
  matchId: string;
  scheduledAt: string; // ISO string (UTC)
  homeScore: number | null;
  awayScore: number | null;
  homeScoreFull: number | null;
  awayScoreFull: number | null;
  status: string;
  stage: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string | null;
  homeTeamCode: string | null;
  homeTeamFlagUrl: string | null;
  awayTeamName: string | null;
  awayTeamCode: string | null;
  awayTeamFlagUrl: string | null;
  extraTime: string | null;
  matchWinnerId: string | null;
};

type EditingState = { matchId: string } & MatchRow;

function formatBOTDate(iso: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function formatBOTTime(iso: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function toInputBOT(iso: string): string {
  const utc = new Date(iso).getTime();
  const bot = new Date(utc - 4 * 60 * 60 * 1000);
  return bot.toISOString().slice(0, 16);
}

interface Props {
  tournamentName: string;
  upcomingMatches: MatchRow[];
  finishedMatches: MatchRow[];
  teams: Team[];
}

export function FixtureClient({ tournamentName, upcomingMatches, finishedMatches, teams }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [editingMatch, setEditingMatch] = useState<EditingState | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function handleDelete(matchId: string) {
    setDeleting(matchId);
    setDeleteError(null);

    const res = await fetch(`/api/admin/matches/${matchId}`, { method: "DELETE" });
    setDeleting(null);

    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error ?? "Error al eliminar.");
      return;
    }

    router.refresh();
  }

  function handleEdit(m: MatchRow) {
    setEditingMatch({ ...m, matchId: m.matchId });
    setMode("edit");
  }

  function handleFormSuccess() {
    setMode("list");
    setEditingMatch(null);
    router.refresh();
  }

  function renderStages(rows: MatchRow[]) {
    const byStage = new Map<string, MatchRow[]>();
    for (const m of rows) {
      const group = byStage.get(m.stage) ?? [];
      group.push(m);
      byStage.set(m.stage, group);
    }

    return STAGE_ORDER.map((stage) => {
      const stageMatches = byStage.get(stage);
      if (!stageMatches?.length) return null;
      return (
        <section key={stage} className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            {STAGE_LABELS[stage] ?? stage}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {stageMatches.map((m) => {
              const homeName = m.homeTeamName ?? "Por definir";
              const awayName = m.awayTeamName ?? "Por definir";
              // 90' es lo que cuenta (BR-003); prórroga/penales va en línea aparte.
              const knockoutNote =
                m.extraTime === "aet"
                  ? `Prórroga: ${m.homeScoreFull ?? "?"} — ${m.awayScoreFull ?? "?"}`
                  : m.extraTime === "pen"
                    ? "Penales"
                    : null;

              return (
                <div
                  key={m.matchId}
                  className="relative rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {/* Menú de acciones — esquina superior derecha */}
                  <div className="absolute right-3 top-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                        disabled={mode !== "list" && editingMatch?.matchId !== m.matchId}
                      >
                        ⋮
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/admin/fixture/${m.matchId}`)}>
                          Ver pronósticos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(m)}>
                          Editar partido
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-live focus:text-live"
                          onClick={() => setPendingDeleteId(m.matchId)}
                          disabled={deleting === m.matchId}
                        >
                          {deleting === m.matchId ? "Eliminando…" : "Eliminar partido"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Hero: CSS Grid 3 cols — score siempre centrado */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-sm font-semibold sm:hidden">{m.homeTeamCode ?? "TBD"}</span>
                      <span className="hidden text-sm font-semibold sm:block">{homeName}</span>
                      {m.homeTeamFlagUrl && (
                        <img src={m.homeTeamFlagUrl} alt="" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
                      )}
                    </div>

                    {m.status === "finished" ? (
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold tabular-nums">
                          {m.homeScore}{" — "}{m.awayScore}
                        </span>
                        {knockoutNote && (
                          <span className="text-[10px] uppercase tracking-wide text-zinc-400">90 min</span>
                        )}
                      </div>
                    ) : m.status === "live" ? (
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold tabular-nums text-live">
                          {m.homeScore ?? 0}
                          {" — "}
                          {m.awayScore ?? 0}
                        </span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold tabular-nums text-zinc-400">
                        {formatBOTTime(m.scheduledAt)}
                      </span>
                    )}

                    <div className="flex items-center justify-start gap-1.5">
                      {m.awayTeamFlagUrl && (
                        <img src={m.awayTeamFlagUrl} alt="" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
                      )}
                      <span className="text-sm font-semibold sm:hidden">{m.awayTeamCode ?? "TBD"}</span>
                      <span className="hidden text-sm font-semibold sm:block">{awayName}</span>
                    </div>
                  </div>

                  {m.status === "finished" && knockoutNote && (
                    <p className="mt-1 text-center text-xs text-zinc-500">{knockoutNote}</p>
                  )}

                  {/* Meta: etapa + fecha sin hora + badges */}
                  <div className="mt-2 space-y-0.5 text-center text-xs text-zinc-400">
                    <p>{STAGE_LABELS[m.stage] ?? m.stage}</p>
                    <p className="flex items-center justify-center gap-1.5">
                      <span>{formatBOTDate(m.scheduledAt)}</span>
                      {m.status === "finished" && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-500 dark:bg-zinc-800">
                          Finalizado
                        </span>
                      )}
                      {m.status === "live" && (
                        <span className="rounded-full bg-live/10 px-2 py-0.5 text-live animate-pulse">
                          🔴 En vivo
                        </span>
                      )}
                      {(!m.homeTeamName || !m.awayTeamName) && (
                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">
                          Por definir
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Separador */}
                  <div className="my-3 border-t border-zinc-100 dark:border-zinc-800" />

                  {/* Controles de resultado */}
                  {m.status === "live" ? (
                    <LiveControls
                      matchId={m.matchId}
                      status={m.status}
                      stage={m.stage}
                      homeTeamId={m.homeTeamId}
                      awayTeamId={m.awayTeamId}
                      homeScore={m.homeScore}
                      awayScore={m.awayScore}
                      homeTeamName={homeName}
                      awayTeamName={awayName}
                      onUpdate={() => router.refresh()}
                    />
                  ) : m.status === "finished" ? (
                    <ResultForm
                      matchId={m.matchId}
                      stage={m.stage}
                      homeTeamId={m.homeTeamId}
                      awayTeamId={m.awayTeamId}
                      homeTeamName={homeName}
                      awayTeamName={awayName}
                      currentHomeScore={m.homeScore}
                      currentAwayScore={m.awayScore}
                      currentHomeScoreFull={m.homeScoreFull}
                      currentAwayScoreFull={m.awayScoreFull}
                      currentExtraTime={m.extraTime}
                      currentMatchWinnerId={m.matchWinnerId}
                      isFinished={true}
                      onSuccess={() => router.refresh()}
                    />
                  ) : (
                    /* scheduled: live button + direct result entry */
                    <div className="space-y-3">
                      <LiveControls
                        matchId={m.matchId}
                        status={m.status}
                        stage={m.stage}
                        homeTeamId={m.homeTeamId}
                        awayTeamId={m.awayTeamId}
                        homeScore={m.homeScore}
                        awayScore={m.awayScore}
                        homeTeamName={homeName}
                        awayTeamName={awayName}
                        onUpdate={() => router.refresh()}
                      />
                      <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                        <ResultForm
                          matchId={m.matchId}
                          stage={m.stage}
                          homeTeamId={m.homeTeamId}
                          awayTeamId={m.awayTeamId}
                          homeTeamName={homeName}
                          awayTeamName={awayName}
                          currentHomeScore={m.homeScore}
                          currentAwayScore={m.awayScore}
                          currentHomeScoreFull={m.homeScoreFull}
                          currentAwayScoreFull={m.awayScoreFull}
                          currentExtraTime={m.extraTime}
                          currentMatchWinnerId={m.matchWinnerId}
                          isFinished={false}
                          onSuccess={() => router.refresh()}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      );
    });
  }

  return (
    <>
    <div className="space-y-8 p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Fixture</h1>
          <p className="text-sm text-zinc-500">{tournamentName}</p>
        </div>
        {mode === "list" && (
          <Button size="sm" onClick={() => setMode("add")}>
            + Agregar partido
          </Button>
        )}
      </div>

      {(mode === "add" || mode === "edit") && (
        <MatchForm
          teams={teams}
          matchId={mode === "edit" ? editingMatch?.matchId : undefined}
          initialValues={
            mode === "edit" && editingMatch
              ? {
                  stage: editingMatch.stage,
                  homeTeamId: editingMatch.homeTeamId,
                  awayTeamId: editingMatch.awayTeamId,
                  scheduledAtBOT: toInputBOT(editingMatch.scheduledAt),
                }
              : undefined
          }
          onSuccess={handleFormSuccess}
          onCancel={() => { setMode("list"); setEditingMatch(null); }}
        />
      )}

      {deleteError && (
        <Alert variant="destructive">
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      )}

      {upcomingMatches.length === 0 && finishedMatches.length === 0 && (
        <p className="text-sm text-zinc-400">No hay partidos cargados aún.</p>
      )}

      {upcomingMatches.length > 0 && renderStages(upcomingMatches)}

      {finishedMatches.length > 0 && (
        <div className="space-y-8 border-t border-zinc-100 pt-8 dark:border-zinc-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Partidos finalizados
          </h2>
          {renderStages(finishedMatches)}
        </div>
      )}
    </div>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar partido?</AlertDialogTitle>
            <AlertDialogDescription>
              También se eliminarán todos los pronósticos asociados a este partido. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (pendingDeleteId) { handleDelete(pendingDeleteId); setPendingDeleteId(null); } }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
