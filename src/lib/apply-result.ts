// Aplicación de un resultado a un partido + recálculo de puntos · BR-002..BR-005, BR-057
//
// Lógica compartida por las tres rutas que finalizan un partido:
//   · admin/results  → el organizador ingresa el marcador a mano (source='manual')
//   · admin/live      → el organizador corre el partido en vivo  (source='manual')
//   · cron/sync-matches → football-data.org marca FINISHED       (source='auto')
//
// Centralizar esto garantiza que el cálculo de puntos sea IDÉNTICO sin importar
// el origen del resultado (la plata depende de ello).

import { db } from "@/db";
import { matches, participants, predictions, matchPoints } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateMatchPoints, stageHasQualifier, resolveQualifierTeamId } from "@/lib/points";

export type ApplyResultParams = {
  matchId: string;
  tournamentId: string;
  homeScore: number;
  awayScore: number;
  // marcador a los 120 min (solo si hubo prórroga/penales) · BR-029
  homeScoreFull?: number | null;
  awayScoreFull?: number | null;
  // null = decidido en 90 min · 'aet' = prórroga · 'pen' = penales · BR-023
  extraTime?: "aet" | "pen" | null;
  // equipo ganador cuando extraTime no es null · BR-023
  matchWinnerId?: string | null;
  // 'manual' = lo controla el organizador · 'auto' = lo escribió el sync
  source: "manual" | "auto";
};

/**
 * Escribe el resultado del partido y recalcula los match_points de todos los
 * participantes del torneo, dentro de una sola transacción. El marcador que
 * puntúa es el de los 90 minutos reglamentarios (homeScore/awayScore) · BR-005.
 *
 * Idempotente: usa upsert sobre (participantId, matchId), así que reaplicar el
 * mismo (o corregido) resultado simplemente recalcula.
 *
 * @returns cantidad de participantes a los que se les calcularon puntos
 */
export async function applyMatchResult(params: ApplyResultParams): Promise<number> {
  const {
    matchId,
    tournamentId,
    homeScore,
    awayScore,
    homeScoreFull = null,
    awayScoreFull = null,
    extraTime = null,
    matchWinnerId = null,
    source,
  } = params;

  const tournamentParticipants = await db.query.participants.findMany({
    where: eq(participants.tournamentId, tournamentId),
    columns: { id: true },
  });

  const matchPredictions = await db
    .select({
      participantId: predictions.participantId,
      homeScore: predictions.homeScore,
      awayScore: predictions.awayScore,
      isManuallyEntered: predictions.isManuallyEntered,
      qualifierTeamId: predictions.qualifierTeamId,
      predictionId: predictions.id,
    })
    .from(predictions)
    .where(eq(predictions.matchId, matchId));

  const predByParticipant = new Map(matchPredictions.map((p) => [p.participantId, p]));
  const result = { homeScore, awayScore };

  // BR-057: clasificado real de la llave (solo etapas desde octavos). Se resuelve
  // con el estado FINAL del partido: ganador a 90' o matchWinnerId (prórroga/penales).
  const matchRow = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { stage: true, homeTeamId: true, awayTeamId: true },
  });
  const hasQualifier = matchRow != null && stageHasQualifier(matchRow.stage);
  const actualQualifierTeamId = hasQualifier
    ? resolveQualifierTeamId(matchRow.stage, {
        homeScore,
        awayScore,
        homeTeamId: matchRow.homeTeamId,
        awayTeamId: matchRow.awayTeamId,
        matchWinnerId: matchWinnerId ?? null,
      })
    : null;

  await db.transaction(async (tx) => {
    await tx
      .update(matches)
      .set({
        homeScore,
        awayScore,
        homeScoreFull: extraTime ? homeScoreFull : null,
        awayScoreFull: extraTime ? awayScoreFull : null,
        status: "finished",
        extraTime: extraTime ?? null,
        matchWinnerId: matchWinnerId ?? null,
        resultSource: source,
      })
      .where(eq(matches.id, matchId));

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
        result,
        // BR-057: solo en etapas con clasificado; un no colocado nunca gana el +1
        hasQualifier
          ? { predictedTeamId: pred?.qualifierTeamId ?? null, actualTeamId: actualQualifierTeamId }
          : undefined
      );

      // BR-006: "no colocado" = no ingresó pronóstico manualmente. Enlazamos
      // predictionId SOLO para pronósticos manuales, de modo que el invariante
      // `prediction_id IS NULL ⟺ no colocado` quede garantizado por construcción.
      // Así todas las agregaciones SQL del tope (que detectan no-colocado por
      // prediction_id NULL) coinciden con calculateMatchPoints (que usa
      // isManuallyEntered), incluso si alguna vez existiera una predicción no
      // manual (hoy no se crean). Un pronóstico no manual no es elegible al +2
      // y, como no colocado, queda sujeto al tope.
      const placedPredictionId = pred?.isManuallyEntered ? pred.predictionId : null;

      await tx
        .insert(matchPoints)
        .values({
          matchId,
          participantId: participant.id,
          predictionId: placedPredictionId,
          resultPoints: points.resultPoints,
          exactPoints: points.exactPoints,
          qualifierPoints: points.qualifierPoints,
          totalPoints: points.totalPoints,
        })
        .onConflictDoUpdate({
          target: [matchPoints.participantId, matchPoints.matchId],
          set: {
            predictionId: placedPredictionId,
            resultPoints: points.resultPoints,
            exactPoints: points.exactPoints,
            qualifierPoints: points.qualifierPoints,
            totalPoints: points.totalPoints,
          },
        });
    }
  });

  return tournamentParticipants.length;
}
