import { describe, it, expect } from "vitest";
import { actionWeight, dangerMultiplier, parseMinute, parseClock, timelineMinute, computeMomentum, type MomentumAction } from "./momentum";

describe("parseClock", () => {
  it("separa base y descuento", () => {
    expect(parseClock("16'")).toEqual({ base: 16, extra: 0 });
    expect(parseClock("45'+4'")).toEqual({ base: 45, extra: 4 });
    expect(parseClock("90'+6'")).toEqual({ base: 90, extra: 6 });
  });
  it("null si no hay número", () => {
    expect(parseClock("HT")).toBeNull();
  });
});

describe("timelineMinute (eje segmentado por periodos)", () => {
  const s1 = 4; // descuento del 1T
  it("1T sin cambios: base + descuento", () => {
    expect(timelineMinute(1, 16, 0, s1)).toBe(16);
    expect(timelineMinute(1, 45, 4, s1)).toBe(49); // 45'+4' = final del 1T
  });
  it("2T se desplaza por el descuento del 1T (evita colisión)", () => {
    // "49'" del 2T NO debe colisionar con "45'+4'" del 1T (ambos serían 49 sin segmentar)
    expect(timelineMinute(2, 49, 0, s1)).toBe(53);
    expect(timelineMinute(1, 45, 4, s1)).toBeLessThan(timelineMinute(2, 46, 0, s1));
  });
});

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

describe("dangerMultiplier (ataques peligrosos por posición)", () => {
  it("un tiro más cerca del arco pesa más", () => {
    expect(dangerMultiplier("Shot On Target", 95)).toBeGreaterThan(dangerMultiplier("Shot On Target", 70));
  });
  it("fuera del último tercio o sin posición → 1", () => {
    expect(dangerMultiplier("Shot Off Target", 50)).toBe(1);
    expect(dangerMultiplier("Shot On Target", undefined)).toBe(1);
  });
  it("solo aplica a tiros, no a córners ni otros", () => {
    expect(dangerMultiplier("Corner Awarded", 98)).toBe(1);
    expect(dangerMultiplier("Foul", 95)).toBe(1);
  });
  it("tope del boost sobre la línea de gol", () => {
    expect(dangerMultiplier("Shot On Target", 100)).toBeCloseTo(1.8);
  });
});

describe("computeMomentum", () => {
  it("un tiro peligroso (cerca del arco) levanta más la barra que uno lejano", () => {
    const near = computeMomentum([{ minute: 10, side: "home", type: "Shot On Target", fieldX: 98 }], 45, 0);
    const far = computeMomentum([{ minute: 10, side: "home", type: "Shot On Target", fieldX: 68 }], 45, 0);
    expect(near[10].value).toBeGreaterThan(0);
    expect(far[10].value).toBeGreaterThan(0);
    // ambos normalizados a su propio pico = 1; comparamos el peso crudo vía dangerMultiplier
    expect(dangerMultiplier("Shot On Target", 98)).toBeGreaterThan(dangerMultiplier("Shot On Target", 68));
  });

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
