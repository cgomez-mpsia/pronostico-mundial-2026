"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface Standing {
  rank: number;
  participantId: string;
  fullName: string;
  avatarUrl: string | null;
  championFlagUrl: string | null;
  championTeamName: string | null;
  hasPaid: boolean;
  totalPoints: number;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({
  name,
  url,
  championFlagUrl,
  championTeamName,
}: {
  name: string;
  url: string | null;
  championFlagUrl: string | null;
  championTeamName: string | null;
}) {
  return (
    <span className="relative shrink-0">
      {url ? (
        <img src={url} alt={name} className="h-7 w-7 rounded-full object-cover" />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
          {initials(name)}
        </span>
      )}
      {championFlagUrl && (
        <img
          src={championFlagUrl}
          alt={championTeamName ?? "Campeón"}
          title={championTeamName ?? undefined}
          className="absolute -bottom-0.5 -right-1 h-2.5 w-3.5 rounded-sm object-cover ring-1 ring-white dark:ring-zinc-900"
        />
      )}
    </span>
  );
}

async function fetchStandings(): Promise<Standing[]> {
  const res = await fetch("/api/standings");
  if (!res.ok) throw new Error("Error cargando standings");
  return res.json();
}

export function StandingsTable({ currentUserId, isAdmin }: { currentUserId: string; isAdmin: boolean }) {
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
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    name={s.fullName}
                    url={s.avatarUrl}
                    championFlagUrl={s.championFlagUrl}
                    championTeamName={s.championTeamName}
                  />
                  <span className="font-medium">
                    {s.fullName}
                    {s.participantId === currentUserId && (
                      <span className="ml-2 text-xs text-zinc-400">(tú)</span>
                    )}
                    {isAdmin && !s.hasPaid && (
                      <span className="ml-2 text-xs text-amber-500">Pendiente</span>
                    )}
                  </span>
                </div>
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
