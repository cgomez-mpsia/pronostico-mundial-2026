import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const caller = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });
  if (caller?.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const { message } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "El mensaje no puede estar vacío." }, { status: 400 });
  }

  const allSubs = await db.select().from(pushSubscriptions);
  if (allSubs.length === 0) {
    return NextResponse.json({ error: "No hay suscriptores registrados." }, { status: 404 });
  }

  const payload = JSON.stringify({
    title: "⚽ Mundial 2026",
    body: message.trim(),
    url: "/dashboard",
    tag: "broadcast",
  });

  let sent = 0;
  for (const sub of allSubs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (err: unknown) {
      if (
        typeof err === "object" && err !== null && "statusCode" in err &&
        (err.statusCode === 404 || err.statusCode === 410)
      ) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
      }
    }
  }

  return NextResponse.json({ sent, total: allSubs.length });
}
