import { describe, it, expect } from "vitest";
import { actionWeight, parseMinute, computeMomentum, type MomentumAction } from "./momentum";

describe("parseMinute", () => {
  it("parsea minuto simple", () => {
    expect(parseMinute("16'")).toBe(16);
  });
  it("suma el tiempo de descuento", () => {
    expect(parseMinute("45'+3'")).toBe(48);
    expect(parseMinute("90'+6'")).toBe(96);
  });
  it("tolera espacios y formatos sin comilla", () => {
    expect(parseMinute("73")).toBe(73);
    expect(parseMinute(" 45' + 2' ")).toBe(47);
  });
  it("devuelve null si no hay número", () => {
    expect(parseMinute("HT")).toBeNull();
    expect(parseMinute("")).toBeNull();
  });
});

describe("actionWeight", () => {
  it("pondera más un gol que un tiro a puerta que un córner", () => {
    expect(actionWeight("Goal")).toBeGreaterThan(actionWeight("Shot On Target"));
    expect(actionWeight("Shot On Target")).toBeGreaterThan(actionWeight("Corner Awarded"));
  });
  it("ignora acciones neutras", () => {
    expect(actionWeight("Foul")).toBe(0);
    expect(actionWeight("Throw-in")).toBe(0);
    expect(actionWeight("")).toBe(0);
  });
});

describe("computeMomentum", () => {
  it("sin acciones → curva plana en cero", () => {
    const m = computeMomentum([], 45);
    expect(m.every((p) => p.value === 0)).toBe(true);
    expect(m).toHaveLength(46); // minutos 0..45
  });

  it("normaliza el pico a |1| y respeta el signo (local +, visitante −)", () => {
    const actions: MomentumAction[] = [
      { minute: 10, side: "home", type: "Goal" },
      { minute: 30, side: "away", type: "Corner Awarded" },
    ];
    const m = computeMomentum(actions, 30, 0); // sin suavizado para aislar el pico
    const peak = Math.max(...m.map((p) => Math.abs(p.value)));
    expect(peak).toBeCloseTo(1);
    expect(m[10].value).toBeGreaterThan(0); // local arriba
    expect(m[30].value).toBeLessThan(0); // visitante abajo
  });

  it("extiende el span al menos hasta el minuto 45", () => {
    const m = computeMomentum([{ minute: 5, side: "home", type: "Goal" }], 20);
    expect(m).toHaveLength(46);
  });

  it("el suavizado reparte el peso a minutos vecinos", () => {
    const m = computeMomentum([{ minute: 20, side: "home", type: "Goal" }], 45, 2);
    expect(m[19].value).toBeGreaterThan(0);
    expect(m[21].value).toBeGreaterThan(0);
  });
});
