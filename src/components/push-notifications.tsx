"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export function PushNotifications() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  function dismissIOSBanner() {
    localStorage.setItem("ios-banner-dismissed", "1");
    setShowIOSBanner(false);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    // iOS fuera de standalone: no soporta push, mostrar banner de instrucciones
    if (isIOS() && !isInStandaloneMode()) {
      const dismissed = localStorage.getItem("ios-banner-dismissed");
      if (!dismissed) setShowIOSBanner(true);
      return;
    }

    // Diagnóstico en iOS standalone
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
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      const key = sub.getKey("p256dh");
      const auth = sub.getKey("auth");

      // Usar Array.from para evitar stack overflow con arrays grandes
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

  async function handleTest() {
    setLoading(true);
    const res = await fetch("/api/admin/push-test", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      alert(`Error: ${data.error ?? "desconocido"}`);
    } else {
      alert(`Enviado a ${data.sent} dispositivo(s). Revisa las notificaciones.`);
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

  if (debugInfo) {
    return (
      <span className="text-[10px] text-amber-500">{debugInfo}</span>
    );
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
        <button
          onClick={dismissIOSBanner}
          className="shrink-0 text-zinc-400 hover:text-zinc-600"
          aria-label="Cerrar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (!supported) return null;
  if (permission === "denied") return null;

  if (subscribed) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-zinc-500"
          onClick={handleDisable}
          disabled={loading}
          title="Desactivar recordatorios de partidos"
        >
          <Bell className="h-3.5 w-3.5 text-green-500" />
          <span className="hidden sm:inline">Notificaciones activas</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-600"
          onClick={handleTest}
          disabled={loading}
          title="Enviar notificación de prueba"
        >
          Probar
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs text-zinc-500 hover:text-zinc-800"
      onClick={handleEnable}
      disabled={loading}
      title="Activar recordatorios de partidos"
    >
      <BellOff className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{loading ? "Activando…" : "Activar notificaciones"}</span>
    </Button>
  );
}
