"use client";

// Presencia en tiempo real (Supabase Realtime Presence).
//
// Un único canal "online-users" compartido por toda la app: cada cliente
// autenticado se anuncia con su userId y todos ven quién está conectado.
// El badge verde aparece/desaparece al abrir/cerrar la app (no es "última vez").
//
// Se consume en: tabla de posiciones, lista de participantes (admin) y el
// contador del header.

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Set de userIds (auth) actualmente en línea
const OnlineContext = createContext<Set<string>>(new Set());

export function PresenceProvider({
  userId,
  fullName,
  children,
}: {
  userId: string;
  fullName: string;
  children: React.ReactNode;
}) {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    // key = userId → presenceState() queda indexado por usuario
    const channel = supabase.channel("online-users", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId, fullName, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fullName]);

  return <OnlineContext.Provider value={online}>{children}</OnlineContext.Provider>;
}

export function useOnlineUsers() {
  return useContext(OnlineContext);
}

/** Punto verde junto a un usuario si está en línea ahora. */
export function OnlineDot({ userId, className = "" }: { userId: string; className?: string }) {
  const online = useOnlineUsers();
  if (!userId || !online.has(userId)) return null;
  return (
    <span
      title="En línea"
      aria-label="En línea"
      className={`inline-block h-2 w-2 shrink-0 rounded-full bg-success ${className}`}
    />
  );
}

/** Contador global "N en línea" para el header. */
export function OnlineCount() {
  const n = useOnlineUsers().size;
  if (n === 0) return null;
  return (
    <span
      className="hidden items-center gap-1.5 text-xs text-zinc-500 sm:flex"
      title={`${n} ${n === 1 ? "persona conectada" : "personas conectadas"}`}
    >
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-success" />
      {n} en línea
    </span>
  );
}
