import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { participants, tournaments, teams } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { isChampionLocked } from "@/lib/champion-lock";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { teamId } = await request.json();
  if (!teamId) {
    return NextResponse.json({ error: "teamId requerido." }, { status: 400 });
  }

  // Verificar que el equipo existe
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    columns: { id: true, name: true },
  });
  if (!team) {
    return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
  }

  // Torneo activo o draft
  const tournament = await db.query.tournaments.findFirst({
    where: or(
      eq(tournaments.status, "active"),
      eq(tournaments.status, "draft")
    ),
    columns: { id: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "No hay torneo activo." }, { status: 400 });
  }

  // Bloqueado cuando comienzan las semifinales · BR-010
  if (await isChampionLocked(tournament.id)) {
    return NextResponse.json(
      { error: "Las semifinales ya iniciaron. No puedes cambiar tu elección." },
      { status: 403 }
    );
  }

  // Buscar participante
  const participant = await db.query.participants.findFirst({
    where: eq(participants.userId, user.id),
    columns: { id: true, hasPaid: true },
  });

  if (!participant) {
    return NextResponse.json({ error: "No eres participante del torneo." }, { status: 403 });
  }

  if (!participant.hasPaid) {
    return NextResponse.json(
      { error: "Tu inscripción está pendiente de confirmación de pago." },
      { status: 403 }
    );
  }

  await db
    .update(participants)
    .set({ championTeamId: teamId })
    .where(eq(participants.id, participant.id));

  return NextResponse.json({ success: true, teamName: team.name });
}
