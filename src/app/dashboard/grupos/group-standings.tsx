"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { GroupTable } from "@/app/api/group-standings/route";

type Feed = { groups: GroupTable[]; hasLive: boolean };

async function fetchGroups(): Promise<Feed> {
  const res = await fetch("/api/group-standings");
  if (!res.ok) throw new Error("Error cargando grupos");
  return res.json();
}

export function GroupStandings() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["group-standings"],
    queryFn: fetchGroups,
    // Polling más agresivo cuando hay partido en vivo; tranquilo si no.
    refetchInterval: (query) => (query.state.data?.hasLive ? 15_000 : 60_000),
  });

  // Realtime: invalida en cuanto un partido pasa a vivo/finalizado (refresco inmediato)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("live_match_groups")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        (payload) => {
          const updated = payload.new as { status: string };
          if (updated.status === "live" || updated.status === "finished") {
            queryClient.invalidateQueries({ queryKey: ["group-standings"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading) {
    return <p className="text-sm text-zinc-400">Cargando…</p>;
  }

  const groups = data?.groups ?? [];

  if (groups.length === 0) {
    return <p className="text-sm text-zinc-400">Las tablas se mostrarán cuando empiece el torneo.</p>;
  }

  return (
    <>
      {data?.hasLive && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-500">
          <span className="animate-pulse">●</span>
          En vivo — las tablas se actualizan automáticamente
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(({ group, rows, hasLive }) => (
          <div
            key={group}
            className={`rounded-xl border ${hasLive ? "border-red-300 dark:border-red-900/60" : "border-zinc-200 dark:border-zinc-800"}`}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
              <h2 className="text-sm font-semibold">Grupo {group}</h2>
              {hasLive && (
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-red-500">
                  <span className="animate-pulse">●</span> En vivo
                </span>
              )}
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-400">
                  <th className="px-4 py-1.5 text-left font-medium">Equipo</th>
                  <th className="px-1 py-1.5 text-center font-medium">PJ</th>
                  <th className="px-1 py-1.5 text-center font-medium">G</th>
                  <th className="px-1 py-1.5 text-center font-medium">E</th>
                  <th className="px-1 py-1.5 text-center font-medium">P</th>
                  <th className="px-1 py-1.5 text-center font-medium">GF</th>
                  <th className="px-1 py-1.5 text-center font-medium">GC</th>
                  <th className="px-1 py-1.5 text-center font-medium">DG</th>
                  <th className="px-2 py-1.5 text-center font-semibold">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((s, idx) => (
                  <tr
                    key={s.code}
                    className={
                      s.live !== null
                        ? "bg-red-50/60 dark:bg-red-900/10"
                        : idx < 2 && s.pj > 0
                          ? "bg-emerald-50/50 dark:bg-emerald-900/10"
                          : ""
                    }
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 shrink-0 text-right text-zinc-400">{idx + 1}</span>
                        {s.flagUrl && <img src={s.flagUrl} alt="" className="h-3.5 w-5 shrink-0 rounded-sm object-cover" />}
                        <span className="truncate font-medium">{s.name}</span>
                        {s.live !== null && (
                          <span className="ml-1 shrink-0 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-red-500">
                            {s.live}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.pj}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.g}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.e}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.p}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.gf}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.gc}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.dg}</td>
                    <td className="px-2 py-2 text-center font-bold tabular-nums">{s.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
}
