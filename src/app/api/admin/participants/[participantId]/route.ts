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

  if (typeof body.hasPaid !== "boolean") {
    return NextResponse.json({ error: "hasPaid (boolean) es requerido." }, { status: 400 });
  }

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, participantId),
    columns: { id: true },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participante no encontrado." }, { status: 404 });
  }

  await db
    .update(participants)
    .set({ hasPaid: body.hasPaid })
    .where(eq(participants.id, participantId));

  return NextResponse.json({ ok: true });
}
