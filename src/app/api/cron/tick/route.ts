// Orquestador de cron · dispara los dos trabajos en una sola corrida
//
// Pensado para schedulers con un solo job disponible (p. ej. plan free de
// cron-job.org). Apuntar el único cron a este endpoint cada ~5 min:
//   GET /api/cron/tick   (header x-cron-secret)
//
// Ejecuta sync-matches y match-reminders en paralelo, reutilizando los
// endpoints existentes tal cual (no duplica su lógica). Correr los
// recordatorios cada 5 min en vez de 10 es seguro: notification_log
// deduplica por (participante, partido, tipo).

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  // Origen del propio deployment (robusto en Vercel detrás del proxy)
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("host");
  const origin = `${proto}://${host}`;

  const call = async (path: string) => {
    try {
      const r = await fetch(`${origin}${path}`, {
        headers: { "x-cron-secret": secret },
        cache: "no-store",
      });
      return { status: r.status, body: await r.json().catch(() => null) };
    } catch (e) {
      return { status: 0, error: e instanceof Error ? e.message : String(e) };
    }
  };

  const [sync, reminders] = await Promise.all([
    call("/api/cron/sync-matches"),
    call("/api/cron/match-reminders"),
  ]);

  return NextResponse.json({ ok: true, sync, reminders });
}
