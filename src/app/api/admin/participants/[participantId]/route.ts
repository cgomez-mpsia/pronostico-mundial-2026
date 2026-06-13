import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, participants } from "@/db/schema";
import { eq } from "drizzle-orm";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const row = await db.query.users.findFirst({ where: eq(users.id, user.id), columns: { role: true } });
  return row?.role === "admin" ? user : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const { participantId } = await params;
  const body = await req.json();

  const hasHasPaid = typeof body.hasPaid === "boolean";
  const hasAbandoned = typeof body.abandoned === "boolean";

  if (!hasHasPaid && !hasAbandoned) {
    return NextResponse.json(
      { error: "Se requiere hasPaid (boolean) o abandoned (boolean)." },
      { status: 400 }
    );
  }

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, participantId),
    columns: { id: true },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participante no encontrado." }, { status: 404 });
  }

  // Soft delete reversible: abandoned=true marca la fecha; false reactiva (null).
  const updates: Partial<typeof participants.$inferInsert> = {};
  if (hasHasPaid) updates.hasPaid = body.hasPaid;
  if (hasAbandoned) updates.abandonedAt = body.abandoned ? new Date() : null;

  await db.update(participants).set(updates).where(eq(participants.id, participantId));

  return NextResponse.json({ ok: true });
}
