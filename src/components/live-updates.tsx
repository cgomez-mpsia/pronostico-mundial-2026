"use client";

// Entrega de actualizaciones en vivo por POLLING (reemplaza al Realtime, que no
// estaba llegando al navegador). Un único poller global montado en AppLayout:
//   - consulta /api/live-matches cada POLL_MS
//   - si cambió algo → router.refresh() (actualiza la página actual)
//   - emite toasts: ⚽ gol · 🔴 inicio · 🏁 final
//   - tras un final, recalcula tu posición y avisa 📈/📉
//
// Reemplaza a FixtureRealtime, LiveToasts y LiveNotifications.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const POLL_MS = 12_000;

type FeedMatch = {
  id: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  homeTeamName: string | null;
  awayTeamName: string | null;
};

type Snap = { home: number; away: number; status: string };

export function LiveUpdates({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const prev = useRef<Map<string, Snap> | null>(null); // null = sin baseline aún
  const myRank = useRef<number | null>(null);

  useEffect(() => {
    let stopped = false;

    async function checkRank() {
      try {
        const res = await fetch("/api/standings");
        if (!res.ok) return;
        const standings = (await res.json()) as { userId: string; rank: number }[];
        const me = standings.find((s) => s.userId === currentUserId);
        if (!me) return;
        const before = myRank.current;
        if (before !== null && me.rank !== before) {
          if (me.rank < before) toast.success(`📈 ¡Subiste al ${me.rank}° puesto!`);
          else toast(`📉 Bajaste al ${me.rank}° puesto`);
        }
        myRank.current = me.rank;
      } catch {
        /* ignore */
      }
    }

    async function poll() {
      try {
        const res = await fetch("/api/live-matches");
        if (!res.ok) return;
        const feed = (await res.json()) as FeedMatch[];
        const base = prev.current;
        let changed = false;
        let finishedHappened = false;
        const next = new Map<string, Snap>();

        for (const m of feed) {
          const home = m.homeScore ?? 0;
          const away = m.awayScore ?? 0;
          next.set(m.id, { home, away, status: m.status });
          const A = m.homeTeamName ?? "Local";
          const B = m.awayTeamName ?? "Visitante";

          if (base) {
            const was = base.get(m.id);
            if (!was) {
              // partido nuevo en el feed
              if (m.status === "live") toast(`🔴 ¡Empezó! ${A} vs ${B}`, { duration: 5000 });
              changed = true;
            } else if (was.status === "live" && m.status === "finished") {
              toast(`🏁 Final · ${A} ${home} - ${away} ${B}`, { duration: 6000 });
              finishedHappened = true;
              changed = true;
            } else if (m.status === "live" && (home !== was.home || away !== was.away)) {
              toast(`⚽ ¡Gol! ${A} ${home} - ${away} ${B}`, { duration: 5000 });
              changed = true;
            } else if (home !== was.home || away !== was.away || m.status !== was.status) {
              changed = true;
            }
          }
        }

        prev.current = next;
        if (base && changed) router.refresh();
        if (base === null) checkRank(); // baseline de posición sin avisar
        else if (finishedHappened) checkRank();
      } catch {
        /* sin red / error transitorio → reintentar en el próximo tick */
      }
    }

    poll();
    const t = setInterval(() => {
      if (!stopped) poll();
    }, POLL_MS);

    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [router, currentUserId]);

  return null;
}
