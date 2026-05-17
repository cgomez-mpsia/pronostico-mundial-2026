import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, participants, tournaments } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

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

  const { winnerTeamId } = await req.json();
  if (!winnerTeamId) {
    return NextResponse.json({ error: "Se requiere el equipo campeón." }, { status: 400 });
  }

  const tournament = await db.query.tournaments.findFirst({
    where: or(eq(tournaments.status, "active"), eq(tournaments.status, "finished")),
    columns: { id: true, championApplied: true },
  });

  if (!tournament) {
    return NextResponse.json({ error: "No hay torneo activo." }, { status: 400 });
  }

  if (tournament.championApplied) {
    return NextResponse.json(
      { error: "Los puntos de campeón ya fueron aplicados." },
      { status: 400 }
    );
  }

  const winners = await db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.tournamentId, tournament.id),
        eq(participants.championTeamId, winnerTeamId)
      )
    );

  await db.transaction(async (tx) => {
    for (const p of winners) {
      await tx
        .update(participants)
        .set({ championPoints: 5 })
        .where(eq(participants.id, p.id));
    }
    await tx
      .update(tournaments)
      .set({ championApplied: true, championAppliedAt: new Date() })
      .where(eq(tournaments.id, tournament.id));
  });

  return NextResponse.json({ ok: true, winnersCount: winners.length });
}
