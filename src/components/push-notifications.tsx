"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, X, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

type PermissionState = "default" | "granted" | "denied";

interface Props {
  isAdmin?: boolean;
}

export function PushNotifications({ isAdmin = false }: Props) {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);

  function dismissIOSBanner() {
    localStorage.setItem("ios-banner-dismissed", "1");
    setShowIOSBanner(false);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isIOS() && !isInStandaloneMode()) {
      const dismissed = localStorage.getItem("ios-banner-dismissed");
      if (!dismissed) setShowIOSBanner(true);
      return;
    }

    if (isIOS()) {
      const hasSW = "serviceWorker" in navigator;
      const hasPush = "PushManager" in window;
      const hasNotif = "Notification" in window;
      if (!hasSW || !hasPush) {
        setDebugInfo(`SW:${hasSW} Push:${hasPush} Notif:${hasNotif}`);
        return;
      }
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    setPermission(Notification.permission as PermissionState);

    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setSubscribed(!!existing);
    });
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      setPermission(perm as PermissionState);
      if (perm !== "granted") return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const key = sub.getKey("p256dh");
      const auth = sub.getKey("auth");
      const p256dh = btoa(Array.from(new Uint8Array(key!)).map((b) => String.fromCharCode(b)).join(""));
      const authKey = btoa(Array.from(new Uint8Array(auth!)).map((b) => String.fromCharCode(b)).join(""));

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, p256dh, auth: authKey }),
      });

      setSubscribed(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleBroadcast() {
    if (!broadcastMsg.trim()) return;
    setBroadcastSending(true);
    const res = await fetch("/api/admin/push-broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: broadcastMsg }),
    });
    const data = await res.json();
    setBroadcastSending(false);
    if (!res.ok) {
      alert(`Error: ${data.error ?? "desconocido"}`);
    } else {
      alert(`Enviado a ${data.sent} de ${data.total} suscriptor(es).`);
      setBroadcastMsg("");
      setBroadcastOpen(false);
    }
  }

  if (debugInfo) {
    return <span className="text-[10px] text-amber-500">{debugInfo}</span>;
  }

  if (showIOSBanner) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
        <span>
          Para recibir recordatorios en iPhone, toca{" "}
          <span className="font-semibold">Compartir</span>{" "}
          <span className="font-mono">⎙</span> →{" "}
          <span className="font-semibold">Agregar a pantalla de inicio</span>
        </span>
        <button onClick={dismissIOSBanner} className="shrink-0 text-zinc-400 hover:text-zinc-600" aria-label="Cerrar">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (!supported) return null;
  if (permission === "denied") return null;

  return (
    <>
      <div className="flex items-center gap-1">
        {subscribed ? (
          <Button
            variant="ghost" size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-zinc-500"
            onClick={handleDisable} disabled={loading}
            title="Desactivar recordatorios de partidos"
          >
            <Bell className="h-3.5 w-3.5 text-green-500" />
            <span className="hidden sm:inline">Notificaciones activas</span>
          </Button>
        ) : (
          <Button
            variant="ghost" size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-zinc-500 hover:text-zinc-800"
            onClick={handleEnable} disabled={loading}
            title="Activar recordatorios de partidos"
          >
            <BellOff className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{loading ? "Activando…" : "Activar notificaciones"}</span>
          </Button>
        )}

        {isAdmin && (
          <Button
            variant="ghost" size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-zinc-400 hover:text-zinc-700"
            onClick={() => setBroadcastOpen(true)}
            title="Enviar mensaje a todos"
          >
            <Megaphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Broadcast</span>
          </Button>
        )}
      </div>

      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar mensaje a todos</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Ej: ¡El partido empieza en 10 minutos!"
            value={broadcastMsg}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBroadcastMsg(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBroadcastOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBroadcast} disabled={broadcastSending || !broadcastMsg.trim()}>
              {broadcastSending ? "Enviando…" : "Enviar a todos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
