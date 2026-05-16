// Motor de cálculo de puntos por partido · BR-002, BR-003, BR-004, BR-005

export type PredictionInput = {
  homeScore: number;
  awayScore: number;
  isManuallyEntered: boolean;
} | null; // null = participante no ingresó pronóstico → se trata como 0-0 con isManuallyEntered=false

export type MatchResult = {
  homeScore: number;
  awayScore: number;
};

export type MatchPointsResult = {
  resultPoints: number; // 0 o 1
  exactPoints: number;  // 0 o 2
  totalPoints: number;  // máx 3
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
 */
export function calculateMatchPoints(
  prediction: PredictionInput,
  result: MatchResult
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

  return {
    resultPoints,
    exactPoints,
    totalPoints: resultPoints + exactPoints,
  };
}
