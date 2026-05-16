import { describe, it, expect } from "vitest";
import { calculateMatchPoints } from "./points";

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
