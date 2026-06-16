// Expresiones SQL compartidas para totales de torneo · BR-006
//
// Centralizar el cálculo del total topado garantiza que la tabla oficial, el
// reparto del pozo (dinero) y el perfil usen EXACTAMENTE la misma fórmula.

import { sql, eq, and, asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { matchPoints, matches, participants } from "@/db/schema";
import { UNPLACED_POINTS_CAP, selectCappedOutUnplacedKeys } from "./points";

export { cappedOutKey } from "./points";

/**
 * Total de puntos de un participante con el tope BR-006 aplicado:
 *
 *   puntos de partidos CON pronóstico (prediction_id no nulo)   — sin tope
 * + min(2, puntos de partidos SIN pronóstico (prediction_id nulo)) — topado
 * + champion_points                                            — sin tope
 *
 * Pensado para queries que agrupan por participante con LEFT JOIN a match_points.
 * Requiere participants.champion_points en el GROUP BY.
 */
export function cappedTotalSql() {
  return sql<number>`
    COALESCE(SUM(CASE WHEN ${matchPoints.predictionId} IS NOT NULL THEN ${matchPoints.totalPoints} ELSE 0 END), 0)
    + LEAST(${UNPLACED_POINTS_CAP}, COALESCE(SUM(CASE WHEN ${matchPoints.predictionId} IS NULL THEN ${matchPoints.totalPoints} ELSE 0 END), 0))
    + ${participants.championPoints}
  `;
}

/**
 * Identifica QUÉ partidos no colocados de cada participante quedan fuera del tope
 * BR-006, para que las vistas de detalle por-partido (partido, "Hoy", fixture)
 * muestren `0` en exactamente los mismos partidos que dejan de contar en el total.
 *
 * Lee todos los puntos de partidos no colocados (prediction_id NULL) del torneo
 * en orden DETERMINISTA (scheduledAt, matchId) — el matchId como desempate hace
 * que partidos simultáneos coincidan en todas las vistas — y delega la atribución
 * del tope a `selectCappedOutUnplacedKeys` (pura, testeada).
 *
 * @returns Set de claves `${participantId}:${matchId}` cuyo punto NO cuenta.
 */
export async function getCappedOutUnplacedKeys(tournamentId: string): Promise<Set<string>> {
  const rows = await db
    .select({
      participantId: matchPoints.participantId,
      matchId: matchPoints.matchId,
      totalPoints: matchPoints.totalPoints,
    })
    .from(matchPoints)
    .innerJoin(matches, eq(matchPoints.matchId, matches.id))
    .where(and(eq(matches.tournamentId, tournamentId), isNull(matchPoints.predictionId)))
    .orderBy(asc(matches.scheduledAt), asc(matchPoints.matchId));

  return selectCappedOutUnplacedKeys(rows);
}
