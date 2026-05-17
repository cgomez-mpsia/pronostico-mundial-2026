import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const { participantId } = await params;
  const { password } = await req.json();

  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, participantId),
    columns: { userId: true },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participante no encontrado." }, { status: 404 });
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(participant.userId, {
    password,
  });

  if (error) {
    return NextResponse.json({ error: "Error al actualizar la contraseña." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
