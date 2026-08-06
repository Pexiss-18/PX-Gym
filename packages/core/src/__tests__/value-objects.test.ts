import { Weight } from "../value-objects/weight";
import { Load } from "../value-objects/load";
import { Macro } from "../value-objects/macro";
import { BodyFatPct } from "../value-objects/body-fat";
import {
  Distance,
  Duration,
  avgPaceMinPerKm,
  haversineMeters,
} from "../value-objects/geo";
import { InvalidValueError } from "../errors";

describe("Weight", () => {
  it("arredonda pra 0.1kg e calcula delta", () => {
    const before = Weight.fromKg(84.26);
    const after = Weight.fromKg(82.5);
    expect(before.kg).toBe(84.3);
    expect(after.deltaFrom(before)).toBe(-1.8);
  });

  it("rejeita valores impossíveis", () => {
    expect(() => Weight.fromKg(0)).toThrow(InvalidValueError);
    expect(() => Weight.fromKg(NaN)).toThrow(InvalidValueError);
    expect(() => Weight.fromKg(500)).toThrow(InvalidValueError);
  });
});

describe("Load", () => {
  it("incrementa e decrementa no passo de 2.5kg do stepper", () => {
    const load = Load.fromKg(60);
    expect(load.increment().kg).toBe(62.5);
    expect(load.decrement().kg).toBe(57.5);
  });

  it("não decrementa abaixo de zero", () => {
    expect(Load.fromKg(1).decrement().kg).toBe(0);
  });

  it("delta positivo representa progressão", () => {
    expect(Load.fromKg(62.5).deltaFrom(Load.fromKg(60))).toBe(2.5);
  });

  it("aceita cargas fora da grade de 2.5 (halteres, máquinas)", () => {
    expect(Load.fromKg(12).kg).toBe(12);
  });
});

describe("Macro", () => {
  it("calcula kcal com a densidade do nutriente", () => {
    expect(Macro.of("protein", 150).kcal).toBe(600);
    expect(Macro.of("fat", 70).kcal).toBe(630);
  });

  it("progresso satura em 1 e não divide por zero", () => {
    const target = Macro.of("carbs", 300);
    expect(Macro.of("carbs", 150).progressTowards(target)).toBe(0.5);
    expect(Macro.of("carbs", 400).progressTowards(target)).toBe(1);
    expect(
      Macro.of("carbs", 10).progressTowards(Macro.of("carbs", 0)),
    ).toBe(1);
  });

  it("rejeita comparação entre macros diferentes", () => {
    expect(() =>
      Macro.of("protein", 10).progressTowards(Macro.of("fat", 10)),
    ).toThrow(InvalidValueError);
  });
});

describe("BodyFatPct", () => {
  it("delta negativo = perdeu gordura", () => {
    expect(BodyFatPct.of(18.2).deltaFrom(BodyFatPct.of(19.0))).toBe(-0.8);
  });
});

describe("geo", () => {
  // ~1.11km entre dois pontos separados por 0.01° de latitude
  const a = { latitude: -19.92, longitude: -43.94 };
  const b = { latitude: -19.91, longitude: -43.94 };

  it("haversine bate com a distância conhecida", () => {
    expect(haversineMeters(a, b)).toBeGreaterThan(1090);
    expect(haversineMeters(a, b)).toBeLessThan(1130);
  });

  it("distância ao longo da rota soma os trechos", () => {
    const d = Distance.alongPath([a, b, a]);
    expect(d.meters).toBeGreaterThan(2180);
    expect(d.km).toBeCloseTo(2.22, 1);
  });

  it("pace médio em min/km", () => {
    const dist = Distance.fromMeters(5000);
    const dur = Duration.fromSeconds(25 * 60);
    expect(avgPaceMinPerKm(dist, dur)).toBe(5);
  });

  it("pace é null pra distância insignificante", () => {
    expect(
      avgPaceMinPerKm(Distance.fromMeters(10), Duration.fromSeconds(60)),
    ).toBeNull();
  });
});
