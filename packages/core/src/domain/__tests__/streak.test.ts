import { computeStreakDays } from "../services/streak";

describe("computeStreakDays", () => {
  const today = "2026-08-06";

  it("zera sem nenhum treino", () => {
    expect(computeStreakDays([], today)).toBe(0);
  });

  it("conta 1 quando só treinou hoje", () => {
    expect(computeStreakDays(["2026-08-06"], today)).toBe(1);
  });

  it("conta dias consecutivos terminando hoje", () => {
    expect(
      computeStreakDays(["2026-08-04", "2026-08-05", "2026-08-06"], today),
    ).toBe(3);
  });

  it("mantém a streak se hoje ainda não treinou (terminou ontem)", () => {
    expect(computeStreakDays(["2026-08-04", "2026-08-05"], today)).toBe(2);
  });

  it("quebra quando um dia inteiro passou em branco", () => {
    expect(computeStreakDays(["2026-08-03", "2026-08-04"], today)).toBe(0);
  });

  it("ignora buracos antes da sequência atual", () => {
    expect(
      computeStreakDays(["2026-08-01", "2026-08-05", "2026-08-06"], today),
    ).toBe(2);
  });

  it("atravessa viradas de mês", () => {
    expect(
      computeStreakDays(["2026-07-31", "2026-08-01"], "2026-08-01"),
    ).toBe(2);
  });

  it("ignora datas duplicadas (várias séries no mesmo dia)", () => {
    expect(
      computeStreakDays(["2026-08-06", "2026-08-06", "2026-08-05"], today),
    ).toBe(2);
  });
});
