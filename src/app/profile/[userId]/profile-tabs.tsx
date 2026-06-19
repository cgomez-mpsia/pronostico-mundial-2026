"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface BreakdownRow {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  matchHomeScore: number | null;
  matchAwayScore: number | null;
  predHomeScore: number | null;
  predAwayScore: number | null;
  isManuallyEntered: boolean;
  resultPoints: number;
  exactPoints: number;
  totalPoints: number;
  // BR-006: true si el punto de este partido no colocado no cuenta (tope alcanzado)
  cappedOut?: boolean;
}

interface PendingRow {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  predHomeScore: number | null;
  predAwayScore: number | null;
  isManuallyEntered: boolean;
}

interface ProfileTabsProps {
  championTeam: { name: string; flagUrl: string | null } | null;
  pctResult: number | null;
  pctExact: number | null;
  resultHits: number;
  exactHits: number;
  predictedCount: number;
  streak: number;
  totalMatches: number;
  isOwnProfile: boolean;
  hasPaid: boolean;
  gap: number;
  isLeader: boolean;
  breakdown: BreakdownRow[];
  championPoints: number;
  myTotalPoints: number;
  pending: PendingRow[];
}

type Tab = "resumen" | "desglose";

export function ProfileTabs({
  championTeam,
  pctResult,
  pctExact,
  resultHits,
  exactHits,
  predictedCount,
  streak,
  totalMatches,
  isOwnProfile,
  hasPaid,
  gap,
  isLeader,
  breakdown,
  championPoints,
  myTotalPoints,
  pending,
}: ProfileTabsProps) {
  const [active, setActive] = useState<Tab>("resumen");

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {(["resumen", "desglose"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize transition-colors",
              active === tab
                ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab: Resumen */}
      {active === "resumen" && (
        <div className="space-y-6">
          {/* Campeón */}
          <div className="space-y-1">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Campeón elegido</p>
            {championTeam ? (
              <p className="text-sm font-medium">{championTeam.name}</p>
            ) : (
              <p className="text-sm text-zinc-400">Sin elección</p>
            )}
          </div>

          {/* Estadísticas */}
          {totalMatches > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              <Stat
                label="% Resultados"
                value={pctResult !== null ? `${pctResult}%` : "—"}
                sublabel={predictedCount > 0 ? `${resultHits}/${predictedCount} pronosticados` : "sin pronósticos"}
              />
              <Stat
                label="% Exactos"
                value={pctExact !== null ? `${pctExact}%` : "—"}
                sublabel={predictedCount > 0 ? `${exactHits}/${predictedCount} pronosticados` : "sin pronósticos"}
              />
              <Stat label="Racha actual" value={streak > 0 ? `${streak}` : "0"} sublabel="partidos" />
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              Aún no hay partidos finalizados. Las estadísticas aparecerán aquí una vez que se registren resultados.
            </p>
          )}

          {/* Sección privada — solo perfil propio */}
          {isOwnProfile && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
              <p className="text-xs text-zinc-400 uppercase tracking-wider">Mi cuenta</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">Cuota:</span>
                {hasPaid ? (
                  <span className="font-medium text-success">Confirmada ✓</span>
                ) : (
                  <span className="font-medium text-warning">Pendiente de confirmación</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">Posición:</span>
                {isLeader ? (
                  <span className="font-medium">Eres el líder del torneo 🏆</span>
                ) : (
                  <span>
                    Te {gap === 1 ? "falta" : "faltan"}{" "}
                    <span className="font-medium">{gap} {gap === 1 ? "punto" : "puntos"}</span>{" "}
                    para el 1er lugar
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Desglose */}
      {active === "desglose" && (
        <div className="space-y-2">
          {breakdown.length === 0 && pending.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Aún no hay partidos finalizados. Tu desglose de puntos aparecerá aquí.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Partido</th>
                      <th className="px-4 py-2 text-center font-medium text-zinc-500">Mi pronóstico</th>
                      <th className="px-4 py-2 text-right font-medium text-zinc-500">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Partidos cerrados sin resultado aún: pronóstico bloqueado, a la espera de calificación */}
                    {pending.map((r) => (
                      <tr
                        key={r.matchId}
                        className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                      >
                        <td className="px-4 py-2.5">
                          <span className="font-medium">
                            {r.homeTeamName} vs {r.awayTeamName}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center text-zinc-500">
                          {r.isManuallyEntered && r.predHomeScore !== null
                            ? `${r.predHomeScore} - ${r.predAwayScore}`
                            : "No pronosticó"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-xs text-warning">Pendiente</span>
                        </td>
                      </tr>
                    ))}

                    {breakdown.map((r) => (
                      <tr
                        key={r.matchId}
                        className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                      >
                        <td className="px-4 py-2.5">
                          <span className="font-medium">
                            {r.homeTeamName} {r.matchHomeScore} — {r.matchAwayScore} {r.awayTeamName}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center text-zinc-500">
                          {r.isManuallyEntered && r.predHomeScore !== null
                            ? `${r.predHomeScore} - ${r.predAwayScore}`
                            : "No pronosticó"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {r.cappedOut ? (
                            <span
                              className="text-zinc-400"
                              title="No cuenta: alcanzaste el tope de 2 pts por partidos sin pronóstico"
                            >
                              0 <span className="text-[10px]">(tope)</span>
                            </span>
                          ) : (
                            <PointsBadge result={r.resultPoints} exact={r.exactPoints} />
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Fila de puntos de campeón */}
                    {championPoints > 0 && (
                      <tr className="border-t-2 border-zinc-200 dark:border-zinc-700 bg-warning/10">
                        <td className="px-4 py-2.5 font-medium" colSpan={2}>
                          Campeón Mundial
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-warning">
                          +{championPoints}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                      <td className="px-4 py-2.5 font-semibold" colSpan={2}>
                        Total
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        {myTotalPoints} pts
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      {sublabel && <p className="text-xs text-zinc-400">{sublabel}</p>}
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

function PointsBadge({ result, exact }: { result: number; exact: number }) {
  const total = result + exact;
  if (total === 0) return <span className="text-zinc-400">0</span>;
  if (total === 3) return <span className="font-semibold text-success">+3</span>;
  return <span className="font-medium text-info">+{total}</span>;
}
