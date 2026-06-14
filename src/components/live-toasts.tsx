"use client";

// Toasts en vivo a partir de Supabase Realtime · app-wide (montado en AppLayout).
//
// Aprovecha que el payload de postgres_changes trae la fila actualizada de
// `matches` para mostrar avisos con contenido real, sin recargar:
//   ⚽ gol · 🔴 inicio · 🏁 final · 📈/📉 cambio en tu posición
//
// Requiere que `matches` esté en la publicación supabase_realtime y con
// REPLICA IDENTITY FULL (para recibir los valores anteriores). Ver
// drizzle/realtime-setup.sql.

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type TeamLite = { name: string; code: string };

type MatchRow = {
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
};

type StandingLite = { userId: string; rank: number };

export function LiveToasts({
  teams,
  currentUserId,
}: {
  teams: Record<string, TeamLite>;
  currentUserId: string;
}) {
  const myRank = useRef<number | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const teamName = (id: string | null) => (id && teams[id]?.name) || "?";

    async function checkRank() {
      try {
        const res = await fetch("/api/standings");
        if (!res.ok) return;
        const standings = (await res.json()) as StandingLite[];
        const me = standings.find((s) => s.userId === currentUserId);
        if (!me) return;
        const prev = myRank.current;
        if (prev !== null && me.rank !== prev) {
          if (me.rank < prev) toast.success(`📈 ¡Subiste al ${me.rank}° puesto!`);
          else toast(`📉 Bajaste al ${me.rank}° puesto`);
        }
        myRank.current = me.rank;
      } catch {
        /* sin red / error transitorio → ignorar */
      }
    }

    const channel = supabase
      .channel("live_toasts")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        (payload) => {
          const n = payload.new as MatchRow;
          const o = payload.old as Partial<MatchRow>;
          const home = teamName(n.home_team_id);
          const away = teamName(n.away_team_id);
          const score = `${n.home_score ?? 0} - ${n.away_score ?? 0}`;

          // Final (status pasó a finished)
          if (n.status === "finished" && o.status !== "finished") {
            toast(`🏁 Final · ${home} ${score} ${away}`, { duration: 6000 });
            return;
          }
          // Inicio (status pasó a live)
          if (n.status === "live" && o.status !== "live") {
            toast(`🔴 ¡Empezó! ${home} vs ${away}`, { duration: 5000 });
            return;
          }
          // Gol (en vivo y cambió el marcador)
          if (
            n.status === "live" &&
            (n.home_score !== o.home_score || n.away_score !== o.away_score)
          ) {
            toast(`⚽ ¡Gol! ${home} ${score} ${away}`, { duration: 5000 });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_points" },
        () => {
          // Un cierre de partido inserta/actualiza muchas filas a la vez →
          // debounce y recalculamos posición una sola vez.
          if (debounce.current) clearTimeout(debounce.current);
          debounce.current = setTimeout(checkRank, 1500);
        }
      )
      .subscribe();

    // Baseline de posición (sin toast la primera vez)
    checkRank();

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      supabase.removeChannel(channel);
    };
  }, [teams, currentUserId]);

  return null;
}
