import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/db";
import { users, participants, tournaments } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export async function POST(request: NextRequest) {
  // 1. Verificar que el llamador es admin (server-side)
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  if (!caller) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const callerRow = await db.query.users.findFirst({
    where: eq(users.id, caller.id),
    columns: { role: true },
  });

  if (callerRow?.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  // 2. Parsear body
  const { fullName, email, password, hasPaid } = await request.json();

  if (!fullName || !email || !password) {
    return NextResponse.json(
      { error: "Nombre, email y contraseña son requeridos." },
      { status: 400 }
    );
  }

  // 3. Buscar torneo activo o en borrador
  const tournament = await db.query.tournaments.findFirst({
    where: or(
      eq(tournaments.status, "active"),
      eq(tournaments.status, "draft")
    ),
    columns: { id: true },
  });

  if (!tournament) {
    return NextResponse.json(
      { error: "No hay un torneo activo. Crea un torneo primero." },
      { status: 400 }
    );
  }

  // 4. Crear usuario en Supabase Auth con service_role
  const adminClient = createAdminClient();
  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    const isDuplicate =
      authError.message.toLowerCase().includes("already") ||
      authError.message.toLowerCase().includes("exists");
    return NextResponse.json(
      {
        error: isDuplicate
          ? "Ya existe una cuenta con ese email."
          : "Error al crear el usuario. Intenta nuevamente.",
      },
      { status: isDuplicate ? 409 : 500 }
    );
  }

  const newUserId = authData.user.id;

  // 5. Insertar en users y participants (rollback manual si algo falla)
  try {
    await db.insert(users).values({
      id: newUserId,
      email,
      fullName,
      role: "participant",
    });

    await db.insert(participants).values({
      userId: newUserId,
      tournamentId: tournament.id,
      hasPaid: Boolean(hasPaid),
    });
  } catch (dbError) {
    // Intentar eliminar el usuario de Auth para mantener consistencia
    await adminClient.auth.admin.deleteUser(newUserId);
    console.error("Error inserting participant, rolled back auth user:", dbError);
    return NextResponse.json(
      { error: "Error al guardar los datos. Intenta nuevamente." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, email, fullName });
}
