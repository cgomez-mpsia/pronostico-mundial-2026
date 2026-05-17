"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ResultForm } from "./result-form";
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
  status: string;
  stage: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  extraTime: string | null;
  matchWinnerId: string | null;
};

type EditingState = { matchId: string } & MatchRow;

function formatBOT(iso: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function toInputBOT(iso: string): string {
  // Convert UTC ISO string to BOT (UTC-4) for datetime-local input
  const utc = new Date(iso).getTime();
  const bot = new Date(utc - 4 * 60 * 60 * 1000);
  return bot.toISOString().slice(0, 16);
}

interface Props {
  tournamentName: string;
  matches: MatchRow[];
  teams: Team[];
}

export function FixtureClient({ tournamentName, matches, teams }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [editingMatch, setEditingMatch] = useState<EditingState | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const byStage = new Map<string, MatchRow[]>();
  for (const m of matches) {
    const group = byStage.get(m.stage) ?? [];
    group.push(m);
    byStage.set(m.stage, group);
  }

  async function handleDelete(matchId: string) {
    if (!confirm("¿Eliminar este partido? También se eliminarán sus pronósticos.")) return;
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

  return (
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

      {matches.length === 0 && (
        <p className="text-sm text-zinc-400">No hay partidos cargados aún.</p>
      )}

      {STAGE_ORDER.map((stage) => {
        const stageMatches = byStage.get(stage);
        if (!stageMatches?.length) return null;
        return (
          <section key={stage} className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              {STAGE_LABELS[stage] ?? stage}
            </h2>
            <div className="divide-y rounded-xl border border-zinc-200 dark:border-zinc-800">
              {stageMatches.map((m) => (
                <div key={m.matchId} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>{formatBOT(m.scheduledAt)}</span>
                      {m.status === "finished" && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-500 dark:bg-zinc-800">
                          Finalizado
                        </span>
                      )}
                      {(!m.homeTeamName || !m.awayTeamName) && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                          Por definir
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Link
                        href={`/admin/fixture/${m.matchId}`}
                        className="inline-flex h-7 items-center rounded px-2 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Pronósticos
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleEdit(m)}
                        disabled={mode !== "list"}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(m.matchId)}
                        disabled={deleting === m.matchId || mode !== "list"}
                      >
                        {deleting === m.matchId ? "…" : "Eliminar"}
                      </Button>
                    </div>
                  </div>
                  <ResultForm
                    matchId={m.matchId}
                    stage={m.stage}
                    homeTeamId={m.homeTeamId}
                    awayTeamId={m.awayTeamId}
                    homeTeamName={m.homeTeamName ?? "Por definir"}
                    awayTeamName={m.awayTeamName ?? "Por definir"}
                    currentHomeScore={m.homeScore}
                    currentAwayScore={m.awayScore}
                    currentExtraTime={m.extraTime}
                    currentMatchWinnerId={m.matchWinnerId}
                    isFinished={m.status === "finished"}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
