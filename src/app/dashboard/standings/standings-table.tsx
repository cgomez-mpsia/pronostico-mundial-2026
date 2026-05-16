"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface Standing {
  rank: number;
  participantId: string;
  fullName: string;
  totalPoints: number;
}

async function fetchStandings(): Promise<Standing[]> {
  const res = await fetch("/api/standings");
  if (!res.ok) throw new Error("Error cargando standings");
  return res.json();
}

export function StandingsTable({ currentUserId }: { currentUserId: string }) {
  const queryClient = useQueryClient();

  const { data: standings = [], isLoading } = useQuery({
    queryKey: ["standings"],
    queryFn: fetchStandings,
    refetchInterval: 10_000, // fallback: refresca cada 10s si Realtime no dispara
  });

  // Supabase Realtime: refetch cuando cambia match_points
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("match_points_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_points" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["standings"] });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] match_points suscrito ✓");
        }
        if (status === "CHANNEL_ERROR") {
          console.warn("[Realtime] Error al suscribirse a match_points");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading) {
    return <p className="text-sm text-zinc-400">Cargando…</p>;
  }

  if (standings.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        Aún no hay participantes o resultados registrados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-zinc-500">
            <th className="pb-2 pr-4 font-medium w-10">#</th>
            <th className="pb-2 pr-4 font-medium">Participante</th>
            <th className="pb-2 text-right font-medium">Puntos</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {standings.map((s) => (
            <tr
              key={s.participantId}
              className={
                s.participantId === currentUserId
                  ? "bg-zinc-50 dark:bg-zinc-800/50"
                  : ""
              }
            >
              <td className="py-2.5 pr-4 tabular-nums text-zinc-400">
                {s.rank}
              </td>
              <td className="py-2.5 pr-4 font-medium">
                {s.fullName}
                {s.participantId === currentUserId && (
                  <span className="ml-2 text-xs text-zinc-400">(tú)</span>
                )}
              </td>
              <td className="py-2.5 text-right tabular-nums font-semibold">
                {s.totalPoints}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
