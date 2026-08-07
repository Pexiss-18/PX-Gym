import { computeWeekActivity } from "../services/week-activity";

describe("computeWeekActivity", () => {
  const today = "2026-08-07"; // sexta-feira

  it("devolve 7 dias terminando hoje", () => {
    const week = computeWeekActivity([], today);
    expect(week).toHaveLength(7);
    expect(week[0]!.date).toBe("2026-08-01");
    expect(week[6]!.date).toBe(today);
  });

  it("marca só o último dia como hoje", () => {
    const week = computeWeekActivity([], today);
    expect(week.filter((d) => d.isToday)).toHaveLength(1);
    expect(week[6]!.isToday).toBe(true);
  });

  it("marca os dias que tiveram treino", () => {
    const week = computeWeekActivity(["2026-08-03", "2026-08-07"], today);
    expect(week.filter((d) => d.done).map((d) => d.date)).toEqual([
      "2026-08-03",
      "2026-08-07",
    ]);
  });

  it("ignora datas fora da janela de 7 dias", () => {
    const week = computeWeekActivity(["2026-07-20"], today);
    expect(week.every((d) => !d.done)).toBe(true);
  });

  it("usa as iniciais corretas dos dias em pt-BR", () => {
    // 2026-08-01 é sábado → S, D, S, T, Q, Q, S até sexta.
    expect(computeWeekActivity([], today).map((d) => d.label)).toEqual([
      "S",
      "D",
      "S",
      "T",
      "Q",
      "Q",
      "S",
    ]);
  });

  it("atravessa a virada de mês", () => {
    const week = computeWeekActivity(["2026-07-30"], "2026-08-02");
    expect(week[0]!.date).toBe("2026-07-27");
    expect(week.find((d) => d.date === "2026-07-30")!.done).toBe(true);
  });

  it("aceita janela customizada", () => {
    expect(computeWeekActivity([], today, 3)).toHaveLength(3);
  });
});
