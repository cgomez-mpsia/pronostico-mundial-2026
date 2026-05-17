import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, matches, tournaments } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { calculateDeadline } from "@/lib/deadline";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const row = await db.query.users.findFirst({ where: eq(users.id, user.id), columns: { role: true } });
  return row?.role === "admin" ? user : null;
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const { stage, homeTeamId, awayTeamId, scheduledAt } = await req.json();

  if (!stage || !scheduledAt) {
    return NextResponse.json({ error: "Fase y fecha son requeridos." }, { status: 400 });
  }

  const tournament = await db.query.tournaments.findFirst({
    where: or(eq(tournaments.status, "active"), eq(tournaments.status, "draft")),
    columns: { id: true },
  });

  if (!tournament) {
    return NextResponse.json({ error: "No hay torneo activo." }, { status: 400 });
  }

  const scheduled = new Date(scheduledAt);
  const deadline = calculateDeadline(scheduled);

  const [match] = await db
    .insert(matches)
    .values({
      tournamentId: tournament.id,
      homeTeamId: homeTeamId ?? null,
      awayTeamId: awayTeamId ?? null,
      scheduledAt: scheduled,
      deadlineAt: deadline,
      status: "scheduled",
      stage,
    })
    .returning({ id: matches.id });

  return NextResponse.json({ id: match.id });
}
