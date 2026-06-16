import { describe, it, expect } from "vitest";
import {
  calculateMatchPoints,
  applyUnplacedCap,
  UNPLACED_POINTS_CAP,
  selectCappedOutUnplacedKeys,
  cappedOutKey,
} from "./points";

describe("calculateMatchPoints · BR-002, BR-003, BR-004", () => {
  // ── Casos con pronóstico ingresado manualmente ──────────────────────────

  it("score exacto ingresado → 3 puntos (1+2)", () => {
    const r = calculateMatchPoints(
      { homeScore: 2, awayScore: 1, isManuallyEntered: true },
      { homeScore: 2, awayScore: 1 }
    );
    expect(r).toEqual({ resultPoints: 1, exactPoints: 2, totalPoints: 3 });
  });

  it("resultado correcto pero score incorrecto → 1 punto", () => {
    const r = calculateMatchPoints(
      { homeScore: 2, awayScore: 0, isManuallyEntered: true },
      { homeScore: 2, awayScore: 1 }
    );
    expect(r).toEqual({ resultPoints: 1, exactPoints: 0, totalPoints: 1 });
  });

  it("resultado incorrecto → 0 puntos", () => {
    const r = calculateMatchPoints(
      { homeScore: 2, awayScore: 1, isManuallyEntered: true },
      { homeScore: 1, awayScore: 2 }
    );
    expect(r).toEqual({ resultPoints: 0, exactPoints: 0, totalPoints: 0 });
  });

  it("empate exacto ingresado → 3 puntos", () => {
    const r = calculateMatchPoints(
      { homeScore: 1, awayScore: 1, isManuallyEntered: true },
      { homeScore: 1, awayScore: 1 }
    );
    expect(r).toEqual({ resultPoints: 1, exactPoints: 2, totalPoints: 3 });
  });

  it("empate 0-0 ingresado manualmente → 3 puntos", () => {
    const r = calculateMatchPoints(
      { homeScore: 0, awayScore: 0, isManuallyEntered: true },
      { homeScore: 0, awayScore: 0 }
    );
    expect(r).toEqual({ resultPoints: 1, exactPoints: 2, totalPoints: 3 });
  });

  it("pronóstico empate pero resultado victoria local → 0 puntos", () => {
    const r = calculateMatchPoints(
      { homeScore: 1, awayScore: 1, isManuallyEntered: true },
      { homeScore: 2, awayScore: 0 }
    );
    expect(r).toEqual({ resultPoints: 0, exactPoints: 0, totalPoints: 0 });
  });

  // ── Casos especiales: pronóstico NO ingresado · BR-004 ──────────────────

  it("no ingresado (null) + partido termina 0-0 → solo 1 punto, no +2", () => {
    // BR-004: aunque el default 0-0 coincide con el resultado, no aplican los +2
    const r = calculateMatchPoints(null, { homeScore: 0, awayScore: 0 });
    expect(r).toEqual({ resultPoints: 1, exactPoints: 0, totalPoints: 1 });
  });

  it("no ingresado (null) + partido NO termina 0-0 (victoria local) → 0 puntos", () => {
    const r = calculateMatchPoints(null, { homeScore: 1, awayScore: 0 });
    expect(r).toEqual({ resultPoints: 0, exactPoints: 0, totalPoints: 0 });
  });

  it("no ingresado (null) + partido termina en empate distinto de 0-0 → 1 punto (acertó resultado draw, no +2)", () => {
    // 0-0 default también predice empate → coincide el resultado (V/E/D)
    // pero isManuallyEntered=false → no aplica +2 por score exacto
    const r = calculateMatchPoints(null, { homeScore: 1, awayScore: 1 });
    expect(r).toEqual({ resultPoints: 1, exactPoints: 0, totalPoints: 1 });
  });

  it("no ingresado (null) + victoria visitante → 0 puntos", () => {
    const r = calculateMatchPoints(null, { homeScore: 0, awayScore: 2 });
    expect(r).toEqual({ resultPoints: 0, exactPoints: 0, totalPoints: 0 });
  });

  it("isManuallyEntered=false explícito + score 0-0 exacto → solo 1 punto", () => {
    // Mismo comportamiento que null (fallback admin con 0-0)
    const r = calculateMatchPoints(
      { homeScore: 0, awayScore: 0, isManuallyEntered: false },
      { homeScore: 0, awayScore: 0 }
    );
    expect(r).toEqual({ resultPoints: 1, exactPoints: 0, totalPoints: 1 });
  });

  // ── Validación límite de puntos ─────────────────────────────────────────

  it("totalPoints nunca supera 3", () => {
    const r = calculateMatchPoints(
      { homeScore: 3, awayScore: 1, isManuallyEntered: true },
      { homeScore: 3, awayScore: 1 }
    );
    expect(r.totalPoints).toBeLessThanOrEqual(3);
  });
});

describe("applyUnplacedCap · BR-006 (tope de partidos sin pronóstico)", () => {
  it("el tope es 2", () => {
    expect(UNPLACED_POINTS_CAP).toBe(2);
  });

  it("partidos no colocados por debajo del tope → suman completos", () => {
    // 1 empate sin pronóstico
    expect(applyUnplacedCap(0, 1)).toBe(1);
    // 2 empates sin pronóstico (justo en el tope)
    expect(applyUnplacedCap(0, 2)).toBe(2);
  });

  it("partidos no colocados por encima del tope → se topan en 2", () => {
    // 3 empates sin pronóstico: solo cuentan 2
    expect(applyUnplacedCap(0, 3)).toBe(2);
    // 10 empates sin pronóstico: siguen siendo 2
    expect(applyUnplacedCap(0, 10)).toBe(2);
  });

  it("los puntos de partidos CON pronóstico no tienen tope", () => {
    expect(applyUnplacedCap(30, 0)).toBe(30);
    // colocados + no colocados topados
    expect(applyUnplacedCap(30, 5)).toBe(32);
  });

  it("los puntos de campeón se suman sin tope", () => {
    expect(applyUnplacedCap(10, 5, 5)).toBe(10 + 2 + 5);
  });

  it("caso típico: jugador que nunca pronostica solo puede sumar 2 pts en todo el torneo", () => {
    // 8 empates a lo largo del torneo, ningún pronóstico colocado, sin campeón
    expect(applyUnplacedCap(0, 8, 0)).toBe(2);
  });
});

describe("selectCappedOutUnplacedKeys · BR-006 (qué partido queda fuera del tope)", () => {
  it("los primeros 2 empates no colocados cuentan; del 3.º en adelante quedan fuera", () => {
    const capped = selectCappedOutUnplacedKeys([
      { participantId: "A", matchId: "m1", totalPoints: 1 },
      { participantId: "A", matchId: "m2", totalPoints: 1 },
      { participantId: "A", matchId: "m3", totalPoints: 1 },
      { participantId: "A", matchId: "m4", totalPoints: 1 },
    ]);
    expect(capped.has(cappedOutKey("A", "m1"))).toBe(false);
    expect(capped.has(cappedOutKey("A", "m2"))).toBe(false);
    expect(capped.has(cappedOutKey("A", "m3"))).toBe(true);
    expect(capped.has(cappedOutKey("A", "m4"))).toBe(true);
    expect(capped.size).toBe(2);
  });

  it("respeta el orden recibido (determinista): topa los últimos, no los primeros", () => {
    const capped = selectCappedOutUnplacedKeys([
      { participantId: "A", matchId: "early", totalPoints: 1 },
      { participantId: "A", matchId: "mid", totalPoints: 1 },
      { participantId: "A", matchId: "late", totalPoints: 1 },
    ]);
    expect(capped).toEqual(new Set([cappedOutKey("A", "late")]));
  });

  it("un no colocado que no sumó (0 pts) no consume tope", () => {
    const capped = selectCappedOutUnplacedKeys([
      { participantId: "A", matchId: "m1", totalPoints: 0 }, // no empate → 0, no consume
      { participantId: "A", matchId: "m2", totalPoints: 1 },
      { participantId: "A", matchId: "m3", totalPoints: 1 },
      { participantId: "A", matchId: "m4", totalPoints: 1 }, // este es el 3.º que sí suma → fuera
    ]);
    expect(capped.has(cappedOutKey("A", "m1"))).toBe(false);
    expect(capped.has(cappedOutKey("A", "m4"))).toBe(true);
    expect(capped.size).toBe(1);
  });

  it("el tope es por participante (independiente entre jugadores)", () => {
    const capped = selectCappedOutUnplacedKeys([
      { participantId: "A", matchId: "m1", totalPoints: 1 },
      { participantId: "B", matchId: "m1", totalPoints: 1 },
      { participantId: "A", matchId: "m2", totalPoints: 1 },
      { participantId: "B", matchId: "m2", totalPoints: 1 },
      { participantId: "A", matchId: "m3", totalPoints: 1 }, // 3.º de A → fuera
      { participantId: "B", matchId: "m3", totalPoints: 1 }, // 3.º de B → fuera
    ]);
    expect(capped).toEqual(
      new Set([cappedOutKey("A", "m3"), cappedOutKey("B", "m3")])
    );
  });

  it("≤ 2 puntos no colocados → nada queda fuera", () => {
    expect(
      selectCappedOutUnplacedKeys([
        { participantId: "A", matchId: "m1", totalPoints: 1 },
        { participantId: "A", matchId: "m2", totalPoints: 1 },
      ]).size
    ).toBe(0);
  });
});
