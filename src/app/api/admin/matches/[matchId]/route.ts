import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, matches, predictions } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { calculateDeadline } from "@/lib/deadline";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const row = await db.query.users.findFirst({ where: eq(users.id, user.id), columns: { role: true } });
  return row?.role === "admin" ? user : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const { matchId } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};

  if (body.stage) update.stage = body.stage;
  if ("homeTeamId" in body) update.homeTeamId = body.homeTeamId;
  if ("awayTeamId" in body) update.awayTeamId = body.awayTeamId;
  if (body.scheduledAt) {
    const scheduled = new Date(body.scheduledAt);
    update.scheduledAt = scheduled;
    update.deadlineAt = calculateDeadline(scheduled);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Sin cambios." }, { status: 400 });
  }

  await db.update(matches).set(update).where(eq(matches.id, matchId));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const { matchId } = await params;

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { status: true },
  });

  if (!match) return NextResponse.json({ error: "Partido no encontrado." }, { status: 404 });
  if (match.status === "finished") {
    return NextResponse.json(
      { error: "Los partidos con resultado registrado no pueden eliminarse." },
      { status: 400 }
    );
  }

  const [{ value: predCount }] = await db
    .select({ value: count() })
    .from(predictions)
    .where(eq(predictions.matchId, matchId));

  await db.delete(matches).where(eq(matches.id, matchId));

  return NextResponse.json({ ok: true, deletedPredictions: Number(predCount) });
}
