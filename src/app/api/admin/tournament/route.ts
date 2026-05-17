import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, tournaments } from "@/db/schema";
import { eq, or } from "drizzle-orm";

const VALID_STATUSES = ["draft", "active", "finished"] as const;

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const row = await db.query.users.findFirst({ where: eq(users.id, user.id), columns: { role: true } });
  return row?.role === "admin" ? user : null;
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (body.name && typeof body.name === "string") update.name = body.name.trim();
  if (body.status) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }
    update.status = body.status;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Sin cambios." }, { status: 400 });
  }

  const tournament = await db.query.tournaments.findFirst({
    where: or(
      eq(tournaments.status, "draft"),
      eq(tournaments.status, "active"),
      eq(tournaments.status, "finished")
    ),
    columns: { id: true },
  });

  if (!tournament) {
    return NextResponse.json({ error: "No hay torneo." }, { status: 404 });
  }

  await db.update(tournaments).set(update).where(eq(tournaments.id, tournament.id));

  return NextResponse.json({ ok: true });
}
