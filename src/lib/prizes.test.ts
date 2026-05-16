import { describe, it, expect } from "vitest";
import { calculatePrizes } from "./prizes";

describe("calculatePrizes · BR-007, BR-008", () => {
  // ── BR-007: umbral de 8 participantes ──────────────────────────────────

  it("≤8 participantes, ganador único → 100% al 1ro", () => {
    const standings = [
      { participantId: "A", totalPoints: 50 },
      { participantId: "B", totalPoints: 30 },
      { participantId: "C", totalPoints: 20 },
    ];
    const prizes = calculatePrizes(standings, 1500);
    const winner = prizes.find((p) => p.participantId === "A")!;
    const second = prizes.find((p) => p.participantId === "B")!;
    expect(winner.prize).toBe(1500);
    expect(second.prize).toBe(0);
  });

  it("exactamente 8 participantes → 100% al 1ro (límite del umbral)", () => {
    const standings = Array.from({ length: 8 }, (_, i) => ({
      participantId: String(i),
      totalPoints: 100 - i * 5,
    }));
    const prizes = calculatePrizes(standings, 4000);
    expect(prizes.find((p) => p.participantId === "0")!.prize).toBe(4000);
    expect(prizes.find((p) => p.participantId === "1")!.prize).toBe(0);
  });

  it(">8 participantes, sin empate → 75% al 1ro y 25% al 2do", () => {
    const standings = Array.from({ length: 10 }, (_, i) => ({
      participantId: String(i),
      totalPoints: 100 - i * 5,
    }));
    const prizes = calculatePrizes(standings, 5000);
    expect(prizes.find((p) => p.participantId === "0")!.prize).toBe(3750);
    expect(prizes.find((p) => p.participantId === "1")!.prize).toBe(1250);
    expect(prizes.find((p) => p.participantId === "2")!.prize).toBe(0);
  });

  // ── BR-008a: empate en 1er lugar ────────────────────────────────────────

  it("empate en 1ro (>8): fusiona 100% y divide entre los empatados", () => {
    const standings = [
      { participantId: "A", totalPoints: 80 },
      { participantId: "B", totalPoints: 80 },
      ...Array.from({ length: 8 }, (_, i) => ({
        participantId: String(i),
        totalPoints: 50 - i,
      })),
    ];
    const prizes = calculatePrizes(standings, 5000);
    const prizeA = prizes.find((p) => p.participantId === "A")!.prize;
    const prizeB = prizes.find((p) => p.participantId === "B")!.prize;
    // 5000 / 2 = 2500 cada uno
    expect(prizeA).toBe(2500);
    expect(prizeB).toBe(2500);
    // El tercero (siguiente en tabla) no cobra
    expect(prizes.find((p) => p.participantId === "0")!.prize).toBe(0);
  });

  it("empate en 1ro (≤8): divide 100% entre los empatados", () => {
    const standings = [
      { participantId: "A", totalPoints: 80 },
      { participantId: "B", totalPoints: 80 },
      { participantId: "C", totalPoints: 40 },
    ];
    const prizes = calculatePrizes(standings, 1500);
    expect(prizes.find((p) => p.participantId === "A")!.prize).toBe(750);
    expect(prizes.find((p) => p.participantId === "B")!.prize).toBe(750);
    expect(prizes.find((p) => p.participantId === "C")!.prize).toBe(0);
  });

  it("tres empatados en 1ro (>8): divide 100% en tres partes iguales", () => {
    const standings = [
      { participantId: "A", totalPoints: 80 },
      { participantId: "B", totalPoints: 80 },
      { participantId: "C", totalPoints: 80 },
      ...Array.from({ length: 8 }, (_, i) => ({
        participantId: String(i),
        totalPoints: 50 - i,
      })),
    ];
    const prizes = calculatePrizes(standings, 3000);
    expect(prizes.find((p) => p.participantId === "A")!.prize).toBe(1000);
    expect(prizes.find((p) => p.participantId === "B")!.prize).toBe(1000);
    expect(prizes.find((p) => p.participantId === "C")!.prize).toBe(1000);
  });

  // ── BR-008b: empate en 2do lugar ───────────────────────────────────────

  it("empate en 2do (>8): divide el 25% entre los empatados", () => {
    const standings = [
      { participantId: "A", totalPoints: 90 },
      { participantId: "B", totalPoints: 60 },
      { participantId: "C", totalPoints: 60 },
      ...Array.from({ length: 8 }, (_, i) => ({
        participantId: String(i),
        totalPoints: 40 - i,
      })),
    ];
    const prizes = calculatePrizes(standings, 5000);
    expect(prizes.find((p) => p.participantId === "A")!.prize).toBe(3750);
    // 1250 / 2 = 625 cada uno
    expect(prizes.find((p) => p.participantId === "B")!.prize).toBe(625);
    expect(prizes.find((p) => p.participantId === "C")!.prize).toBe(625);
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  it("lista vacía → retorna vacío", () => {
    expect(calculatePrizes([], 1000)).toEqual([]);
  });

  it("un solo participante → se lleva todo", () => {
    const prizes = calculatePrizes([{ participantId: "A", totalPoints: 10 }], 500);
    expect(prizes[0].prize).toBe(500);
  });
});
