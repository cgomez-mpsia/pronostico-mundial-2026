import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, participants, matches, predictions, matchPoints } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateMatchPoints } from "@/lib/points";

export async function POST(request: NextRequest) {
  // 1. Verificar admin
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
  const { matchId, homeScore, awayScore } = await request.json();

  if (
    !matchId ||
    typeof homeScore !== "number" ||
    typeof awayScore !== "number" ||
    homeScore < 0 ||
    awayScore < 0
  ) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  // 3. Verificar que el partido existe
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { id: true, tournamentId: true, status: true },
  });

  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado." }, { status: 404 });
  }

  // 4. Obtener todos los participantes del torneo
  const tournamentParticipants = await db.query.participants.findMany({
    where: eq(participants.tournamentId, match.tournamentId),
    columns: { id: true },
  });

  // 5. Obtener todas las predicciones de este partido
  const matchPredictions = await db
    .select({
      participantId: predictions.participantId,
      homeScore: predictions.homeScore,
      awayScore: predictions.awayScore,
      isManuallyEntered: predictions.isManuallyEntered,
      predictionId: predictions.id,
    })
    .from(predictions)
    .where(eq(predictions.matchId, matchId));

  const predByParticipant = new Map(
    matchPredictions.map((p) => [p.participantId, p])
  );

  const result = { homeScore, awayScore };

  // 6. Calcular puntos y preparar upserts dentro de una transacción
  await db.transaction(async (tx) => {
    // Actualizar el partido
    await tx
      .update(matches)
      .set({ homeScore, awayScore, status: "finished" })
      .where(eq(matches.id, matchId));

    // Calcular y upsert match_points para cada participante
    for (const participant of tournamentParticipants) {
      const pred = predByParticipant.get(participant.id) ?? null;
      const points = calculateMatchPoints(
        pred
          ? {
              homeScore: pred.homeScore,
              awayScore: pred.awayScore,
              isManuallyEntered: pred.isManuallyEntered,
            }
          : null,
        result
      );

      await tx
        .insert(matchPoints)
        .values({
          matchId,
          participantId: participant.id,
          predictionId: pred?.predictionId ?? null,
          resultPoints: points.resultPoints,
          exactPoints: points.exactPoints,
          totalPoints: points.totalPoints,
        })
        .onConflictDoUpdate({
          target: [matchPoints.participantId, matchPoints.matchId],
          set: {
            predictionId: pred?.predictionId ?? null,
            resultPoints: points.resultPoints,
            exactPoints: points.exactPoints,
            totalPoints: points.totalPoints,
          },
        });
    }
  });

  return NextResponse.json({
    success: true,
    participantCount: tournamentParticipants.length,
  });
}
