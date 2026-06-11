"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface MatchInfo {
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: string;
}

interface LiveMatchPayload {
  id: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  scheduledAt: string;
}

export function LiveNotifications() {
  const matchInfoRef = useRef<Map<string, MatchInfo>>(new Map());
  const scoresRef = useRef<Map<string, { home: number; away: number }>>(new Map());

  async function fetchLiveMatches() {
    try {
      const res = await fetch("/api/live-matches");
      if (!res.ok) return;
      const matches: Array<{
        id: string;
        homeScore: number | null;
        awayScore: number | null;
        homeTeamName: string | null;
        awayTeamName: string | null;
        scheduledAt: string;
      }> = await res.json();
      for (const m of matches) {
        matchInfoRef.current.set(m.id, {
          homeTeamName: m.homeTeamName ?? "Local",
          awayTeamName: m.awayTeamName ?? "Visitante",
          scheduledAt: m.scheduledAt,
        });
        scoresRef.current.set(m.id, {
          home: m.homeScore ?? 0,
          away: m.awayScore ?? 0,
        });
      }
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchLiveMatches();

    const supabase = createClient();
    const channel = supabase
      .channel("live_goal_notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        (payload) => {
          const row = payload.new as LiveMatchPayload;

          if (row.status === "live" && !matchInfoRef.current.has(row.id)) {
            fetchLiveMatches();
            return;
          }

          if (row.status !== "live") return;

          const info = matchInfoRef.current.get(row.id);
          if (!info) return;

          const newHome = row.homeScore ?? 0;
          const newAway = row.awayScore ?? 0;
          const prev = scoresRef.current.get(row.id);
          const prevHome = prev?.home ?? 0;
          const prevAway = prev?.away ?? 0;

          if (newHome > prevHome) {
            const min = Math.max(1, Math.floor((Date.now() - new Date(info.scheduledAt).getTime()) / 60000));
            toast(`⚽ ${info.homeTeamName}  ${newHome} — ${newAway}  ${info.awayTeamName}  ·  min. ${min}`);
          } else if (newAway > prevAway) {
            const min = Math.max(1, Math.floor((Date.now() - new Date(info.scheduledAt).getTime()) / 60000));
            toast(`⚽ ${info.awayTeamName}  ${newHome} — ${newAway}  ${info.homeTeamName}  ·  min. ${min}`);
          }

          scoresRef.current.set(row.id, { home: newHome, away: newAway });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
