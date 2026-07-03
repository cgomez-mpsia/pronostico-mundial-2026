// Motor de cálculo de puntos por partido · BR-002, BR-003, BR-004, BR-005, BR-006, BR-057

/**
 * BR-057: etapas donde el pronóstico incluye elegir al CLASIFICADO de la llave
 * (obligatorio). Desde octavos de final; r32 y grupos quedan fuera (decisión
 * del cliente, 03-Jul-2026). En 'third' y 'final' se entiende como "quién gana
 * el partido" (incluyendo prórroga/penales).
 */
export const QUALIFIER_STAGES = ["r16", "qf", "sf", "third", "final"] as const;

export function stageHasQualifier(stage: string): boolean {
  return (QUALIFIER_STAGES as readonly string[]).includes(stage);
}

/**
 * Resuelve qué equipo avanza/gana la llave según el resultado final · BR-057.
 *
 * Prioridad: matchWinnerId (definido por el admin cuando hubo prórroga/penales)
 * y, si no, el ganador a los 90'. Devuelve null si la etapa no lleva clasificado
 * o si el dato está incompleto (empate a 90' sin matchWinnerId — no debería
 * ocurrir: el flujo admin lo exige antes de finalizar).
 */
export function resolveQualifierTeamId(
  stage: string,
  match: {
    homeScore: number;
    awayScore: number;
    homeTeamId: string | null;
    awayTeamId: string | null;
    matchWinnerId: string | null;
  }
): string | null {
  if (!stageHasQualifier(stage)) return null;
  if (match.matchWinnerId) return match.matchWinnerId;
  if (match.homeScore > match.awayScore) return match.homeTeamId;
  if (match.awayScore > match.homeScore) return match.awayTeamId;
  return null; // empate a 90' sin ganador registrado → dato incompleto
}

/**
 * BR-006: tope de puntos acumulables por partidos SIN pronóstico colocado.
 * Un partido no colocado (sin fila de predicción) sigue ganando su +1 crudo si
 * acierta el empate (ver calculateMatchPoints), pero la SUMA de esos puntos a lo
 * largo de todo el torneo se topa en este valor. Una vez alcanzado, los demás
 * partidos no colocados aportan 0. Los puntos de partidos con pronóstico y los
 * del campeón no tienen tope.
 */
export const UNPLACED_POINTS_CAP = 2;

/**
 * Aplica el tope BR-006 al total de un participante.
 *
 * El tope es ACUMULADO por jugador en todo el torneo e independiente del orden
 * (cada no colocado aporta a lo sumo 1 pt, así que el total siempre es
 * min(UNPLACED_POINTS_CAP, suma)). Por eso se aplica al agregar, no por partido.
 *
 * @param placedPoints    puntos de partidos CON pronóstico colocado (sin tope)
 * @param unplacedPoints  puntos de partidos SIN pronóstico (se topan)
 * @param championPoints  puntos por campeón acertado (sin tope)
 */
export function applyUnplacedCap(
  placedPoints: number,
  unplacedPoints: number,
  championPoints = 0
): number {
  return placedPoints + Math.min(UNPLACED_POINTS_CAP, unplacedPoints) + championPoints;
}

/** Clave estable de un punto de partido por (participante, partido). */
export function cappedOutKey(participantId: string, matchId: string): string {
  return `${participantId}:${matchId}`;
}

/**
 * Dado el historial de puntos de partidos NO colocados de un torneo, ya ordenado
 * de forma determinista (scheduledAt, matchId), devuelve el Set de claves
 * `${participantId}:${matchId}` cuyo punto NO cuenta por exceder el tope BR-006.
 *
 * Función pura: la consulta a BD vive en `lib/standings.ts`. Separarla permite
 * testear la atribución del tope (qué partido queda fuera) sin tocar la BD.
 */
export function selectCappedOutUnplacedKeys(
  orderedRows: Array<{ participantId: string; matchId: string; totalPoints: number }>
): Set<string> {
  const counted = new Map<string, number>();
  const cappedOut = new Set<string>();
  for (const r of orderedRows) {
    if (r.totalPoints <= 0) continue; // un no colocado que no sumó no consume tope
    const used = counted.get(r.participantId) ?? 0;
    if (used + r.totalPoints <= UNPLACED_POINTS_CAP) {
      counted.set(r.participantId, used + r.totalPoints);
    } else {
      cappedOut.add(cappedOutKey(r.participantId, r.matchId));
    }
  }
  return cappedOut;
}

export type PredictionInput = {
  homeScore: number;
  awayScore: number;
  isManuallyEntered: boolean;
} | null; // null = participante no ingresó pronóstico → se trata como 0-0 con isManuallyEntered=false

export type MatchResult = {
  homeScore: number;
  awayScore: number;
};

/**
 * Pronóstico y resultado del clasificado de la llave · BR-057.
 * `undefined` (no pasar el arg) = etapa sin clasificado (grupos/r32) → 0 pts.
 * predictedTeamId null = el participante no eligió (pronóstico pre-regla o no
 * colocado); actualTeamId null = dato incompleto. En ambos casos no hay +1.
 */
export type QualifierInput = {
  predictedTeamId: string | null;
  actualTeamId: string | null;
};

export type MatchPointsResult = {
  resultPoints: number;    // 0 o 1
  exactPoints: number;     // 0 o 2
  qualifierPoints: number; // 0 o 1 · BR-057 (solo etapas desde octavos)
  totalPoints: number;     // máx 3 en grupos/r32 · máx 4 desde octavos
};

type Outcome = "home" | "away" | "draw";

function getOutcome(home: number, away: number): Outcome {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

/**
 * Calcula los puntos que gana un participante en un partido.
 *
 * BR-002: +1 por acertar resultado (V/E/D)
 * BR-003: +2 adicionales por score exacto (solo si isManuallyEntered=true)
 * BR-004: pronóstico null → evaluado como 0-0 con isManuallyEntered=false
 * BR-005: solo 90 minutos reglamentarios (prórroga y penales ignorados)
 * BR-057: +1 por acertar el clasificado de la llave (desde octavos), medido
 *         por el resultado FINAL (90', prórroga o penales) e independiente
 *         del marcador. Sin `qualifier` (grupos/r32) → 0.
 */
export function calculateMatchPoints(
  prediction: PredictionInput,
  result: MatchResult,
  qualifier?: QualifierInput
): MatchPointsResult {
  // BR-004: null se trata como 0-0 no ingresado manualmente
  const pred = prediction ?? { homeScore: 0, awayScore: 0, isManuallyEntered: false };

  const predictedOutcome = getOutcome(pred.homeScore, pred.awayScore);
  const actualOutcome = getOutcome(result.homeScore, result.awayScore);

  const resultPoints = predictedOutcome === actualOutcome ? 1 : 0;

  // BR-003: +2 por score exacto solo si el pronóstico fue ingresado manualmente
  const isExactScore =
    pred.homeScore === result.homeScore && pred.awayScore === result.awayScore;
  const exactPoints = pred.isManuallyEntered && isExactScore ? 2 : 0;

  // BR-057: +1 por clasificado acertado (ambos lados deben estar definidos)
  const qualifierPoints =
    qualifier != null &&
    qualifier.predictedTeamId != null &&
    qualifier.predictedTeamId === qualifier.actualTeamId
      ? 1
      : 0;

  return {
    resultPoints,
    exactPoints,
    qualifierPoints,
    totalPoints: resultPoints + exactPoints + qualifierPoints,
  };
}
