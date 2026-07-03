import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, participants, matches, predictions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { stageHasQualifier } from "@/lib/points";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { matchId, homeScore, awayScore, qualifierTeamId, participantId: targetParticipantId } = await request.json();

  if (
    !matchId ||
    typeof homeScore !== "number" ||
    typeof awayScore !== "number" ||
    homeScore < 0 ||
    awayScore < 0
  ) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  // Verificar rol del caller una sola vez (necesario tanto para validar acceso como para el override de deadline)
  const callerRow = targetParticipantId
    ? await db.query.users.findFirst({ where: eq(users.id, user.id), columns: { role: true } })
    : null;

  if (targetParticipantId && callerRow?.role !== "admin") {
    return NextResponse.json({ error: "Solo el admin puede ingresar pronósticos por terceros." }, { status: 403 });
  }

  // Verificar que el partido existe y está abierto
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { id: true, deadlineAt: true, status: true, tournamentId: true, stage: true, homeTeamId: true, awayTeamId: true },
  });

  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado." }, { status: 404 });
  }

  // BR-057: desde octavos el pronóstico DEBE incluir al clasificado de la llave
  const requiresQualifier = stageHasQualifier(match.stage);

  if (requiresQualifier) {
    if (!match.homeTeamId || !match.awayTeamId) {
      // Sin equipos definidos no hay clasificado que elegir → se bloquea el pronóstico
      return NextResponse.json(
        { error: "Este partido aún no tiene los equipos definidos. Podrás pronosticar cuando se conozcan los rivales." },
        { status: 400 }
      );
    }
    if (!qualifierTeamId) {
      return NextResponse.json(
        { error: "Debes elegir qué equipo clasifica a la siguiente ronda." },
        { status: 400 }
      );
    }
    if (qualifierTeamId !== match.homeTeamId && qualifierTeamId !== match.awayTeamId) {
      return NextResponse.json(
        { error: "El clasificado debe ser uno de los dos equipos del partido." },
        { status: 400 }
      );
    }
  }

  if (match.status === "finished") {
    return NextResponse.json(
      { error: "El partido ya tiene resultado." },
      { status: 403 }
    );
  }

  // El admin puede ingresar por terceros fuera de plazo (problemas técnicos del jugador).
  // Su propio pronóstico respeta el deadline igual que cualquier participante.
  const adminOverride = !!targetParticipantId && callerRow?.role === "admin";

  if (!adminOverride && new Date() >= match.deadlineAt) {
    return NextResponse.json(
      { error: "El plazo para este partido ya cerró." },
      { status: 403 }
    );
  }

  // Resolver participante: propio o el especificado por admin
  const participant = targetParticipantId
    ? await db.query.participants.findFirst({
        where: and(
          eq(participants.id, targetParticipantId),
          eq(participants.tournamentId, match.tournamentId)
        ),
        columns: { id: true, hasPaid: true, abandonedAt: true },
      })
    : await db.query.participants.findFirst({
        where: and(
          eq(participants.userId, user.id),
          eq(participants.tournamentId, match.tournamentId)
        ),
        columns: { id: true, hasPaid: true, abandonedAt: true },
      });

  if (!participant) {
    return NextResponse.json(
      { error: "No eres participante del torneo." },
      { status: 403 }
    );
  }

  if (participant.abandonedAt) {
    return NextResponse.json(
      { error: "Este participante abandonó el torneo." },
      { status: 403 }
    );
  }

  if (!participant.hasPaid) {
    return NextResponse.json(
      { error: "La inscripción del participante está pendiente de confirmación de pago." },
      { status: 403 }
    );
  }

  // Upsert de la predicción — .returning() para detectar fallos silenciosos del driver
  const savedQualifierTeamId = requiresQualifier ? qualifierTeamId : null;
  const result = await db
    .insert(predictions)
    .values({
      participantId: participant.id,
      matchId,
      homeScore,
      awayScore,
      isManuallyEntered: true,
      qualifierTeamId: savedQualifierTeamId,
    })
    .onConflictDoUpdate({
      target: [predictions.participantId, predictions.matchId],
      set: {
        homeScore,
        awayScore,
        isManuallyEntered: true,
        qualifierTeamId: savedQualifierTeamId,
        submittedAt: new Date(),
      },
    })
    .returning({ id: predictions.id });

  if (result.length === 0) {
    return NextResponse.json(
      { error: "No se pudo guardar el pronóstico. Intenta de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
