// Índice de "dinámica del partido" (momentum) DERIVADO de las acciones del
// commentary de ESPN. ESPN no publica su gráfico de momentum como dato; lo
// reconstruimos ponderando las acciones ofensivas de cada equipo por minuto.
//
// Es una ESTIMACIÓN (no el número exacto de ESPN): nuestro feed es más grueso
// (solo tiros, córners, etc. que ESPN expone en el commentary), así que el
// resultado es la presión relativa, no una métrica oficial. Función pura.

export type MomentumSide = "home" | "away";

export type MomentumAction = {
  /** minuto de juego, p. ej. 16 o 48 (para 45'+3') */
  minute: number;
  side: MomentumSide;
  /** texto del tipo de jugada de ESPN, p. ej. "Shot On Target" */
  type: string;
  /** posición en cancha hacia el arco rival (0-100); 100 = sobre la línea de gol */
  fieldX?: number;
};

export type MomentumPoint = {
  /** minuto entero del bucket */
  minute: number;
  /** valor neto normalizado en [-1, 1]: positivo = local, negativo = visitante */
  value: number;
};

// Peso ofensivo por tipo de jugada. Solo acciones que reflejan ataque/presión;
// faltas, saques y jugadas neutras se ignoran (peso 0).
const WEIGHTS: { test: RegExp; weight: number }[] = [
  { test: /penalty.*(goal|won|scored)/i, weight: 7 },
  { test: /goal/i, weight: 6 },
  { test: /shot on target|shot saved/i, weight: 4 },
  { test: /shot blocked/i, weight: 2.5 },
  { test: /shot off target|shot missed|woodwork|hit the post|hit the bar/i, weight: 2 },
  { test: /corner/i, weight: 1.5 },
  { test: /offside/i, weight: 0.5 },
];

/** Peso ofensivo de una jugada; 0 si es neutra (falta, saque, etc.). */
export function actionWeight(type: string): number {
  for (const { test, weight } of WEIGHTS) {
    if (test.test(type)) return weight;
  }
  return 0;
}

// Zona de "ataque peligroso": último tercio del campo hacia el arco rival.
const DANGER_ZONE_START = 66; // % de cancha (0-100)
const DANGER_MAX_BOOST = 0.8; // un tiro sobre la línea de gol pesa 1.8×

/**
 * Multiplicador por peligrosidad para los TIROS según su cercanía al arco
 * (ESPN no expone "ataques peligrosos", pero sí la posición de cada tiro): un
 * remate dentro del área pesa más que uno lejano. 1 fuera del último tercio o
 * sin posición; hasta 1 + DANGER_MAX_BOOST sobre la línea de gol.
 */
export function dangerMultiplier(type: string, fieldX?: number): number {
  if (fieldX == null || !/shot/i.test(type)) return 1;
  const depth = Math.min(1, Math.max(0, (fieldX - DANGER_ZONE_START) / (100 - DANGER_ZONE_START)));
  return 1 + depth * DANGER_MAX_BOOST;
}

/** Parsea el reloj de ESPN ("16'", "45'+3'", "90'+6'") en minuto base + descuento. */
export function parseClock(display: string): { base: number; extra: number } | null {
  const m = display.match(/(\d+)\s*'?(?:\s*\+\s*(\d+))?/);
  if (!m) return null;
  const base = Number(m[1]);
  if (!Number.isFinite(base)) return null;
  return { base, extra: m[2] ? Number(m[2]) : 0 };
}

/** Parsea el reloj de ESPN a un minuto entero (base + descuento). */
export function parseMinute(display: string): number | null {
  const c = parseClock(display);
  return c ? c.base + c.extra : null;
}

/**
 * Minuto en una línea de tiempo segmentada por periodos. El descuento del 1T
 * ("45'+n") debe quedar ANTES del 2T y no colisionar con sus minutos: por eso
 * el 2T (y posteriores) se desplaza por `firstHalfStoppage` minutos. Así el
 * medio tiempo cae en el final real del primer tiempo (45 + descuento).
 */
export function timelineMinute(
  period: number,
  base: number,
  extra: number,
  firstHalfStoppage: number
): number {
  return period >= 2 ? base + extra + firstHalfStoppage : base + extra;
}

/**
 * Calcula la curva de momentum por minuto.
 *
 * - Acumula el peso firmado de cada acción en su minuto (local +, visitante −).
 * - Suaviza con un kernel triangular ±`smooth` minutos para una curva continua
 *   en vez de barras aisladas (ESPN tiene datos más densos; nosotros suavizamos).
 * - Normaliza al máximo absoluto → barras en [-1, 1].
 *
 * @param maxMinute último minuto a representar (minuto actual del partido, mín. 45).
 */
export function computeMomentum(
  actions: MomentumAction[],
  maxMinute: number,
  smooth = 2
): MomentumPoint[] {
  const last = Math.max(45, Math.ceil(maxMinute));
  const raw = new Array<number>(last + 1).fill(0);

  for (const a of actions) {
    const w = actionWeight(a.type) * dangerMultiplier(a.type, a.fieldX);
    if (w === 0) continue;
    const idx = Math.min(last, Math.max(0, Math.round(a.minute)));
    raw[idx] += a.side === "home" ? w : -w;
  }

  // Kernel triangular: el minuto central pesa (smooth+1), decae 1 por minuto.
  const smoothed = new Array<number>(last + 1).fill(0);
  for (let i = 0; i <= last; i++) {
    let acc = 0;
    let norm = 0;
    for (let d = -smooth; d <= smooth; d++) {
      const j = i + d;
      if (j < 0 || j > last) continue;
      const k = smooth + 1 - Math.abs(d);
      acc += raw[j] * k;
      norm += k;
    }
    smoothed[i] = norm > 0 ? acc / norm : 0;
  }

  const peak = smoothed.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
  return smoothed.map((v, minute) => ({
    minute,
    value: peak > 0 ? v / peak : 0,
  }));
}
