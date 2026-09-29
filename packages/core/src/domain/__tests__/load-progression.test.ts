import { SetLog } from "../entities/set-log";
import { Load } from "../value-objects/load";
import { computeLoadProgression } from "../services/load-progression";

function log(
  sessionDate: string,
  loadKg: number,
  setNumber = 1,
  exerciseId = "supino-reto",
): SetLog {
  return SetLog.create({
    id: `${sessionDate}-${exerciseId}-${setNumber}`,
    sessionDate,
    exerciseId,
    exerciseName: "Supino reto",
    setNumber,
    targetReps: 10,
    previousLoad: Load.fromKg(loadKg),
    load: Load.fromKg(loadKg),
    completedAt: new Date(`${sessionDate}T10:00:00`),
  });
}

describe("computeLoadProgression", () => {
  it("devolve resumo vazio sem nenhum registro", () => {
    const summary = computeLoadProgression([]);
    expect(summary.points).toEqual([]);
    expect(summary.deltaKg).toBe(0);
    expect(summary.bestLoadKg).toBeNull();
    expect(summary.isPersonalRecord).toBe(false);
  });

  it("agrupa séries do mesmo dia num ponto só", () => {
    const summary = computeLoadProgression([
      log("2026-08-01", 60, 1),
      log("2026-08-01", 60, 2),
      log("2026-08-01", 65, 3),
    ]);

    expect(summary.points).toHaveLength(1);
    expect(summary.points[0]).toMatchObject({
      sessionDate: "2026-08-01",
      topLoadKg: 65,
      volumeKg: 185,
      sets: 3,
    });
  });

  it("ordena por data mesmo recebendo os logs embaralhados", () => {
    const summary = computeLoadProgression([
      log("2026-08-05", 70),
      log("2026-08-01", 60),
      log("2026-08-03", 65),
    ]);

    expect(summary.points.map((p) => p.sessionDate)).toEqual([
      "2026-08-01",
      "2026-08-03",
      "2026-08-05",
    ]);
  });

  it("calcula o delta entre a primeira e a última sessão", () => {
    const summary = computeLoadProgression([
      log("2026-08-01", 60),
      log("2026-08-03", 65),
      log("2026-08-05", 72.5),
    ]);
    expect(summary.deltaKg).toBe(12.5);
  });

  it("aponta delta negativo quando a carga caiu", () => {
    const summary = computeLoadProgression([
      log("2026-08-01", 70),
      log("2026-08-05", 65),
    ]);
    expect(summary.deltaKg).toBe(-5);
  });

  it("marca recorde pessoal quando a última sessão supera todas", () => {
    const summary = computeLoadProgression([
      log("2026-08-01", 60),
      log("2026-08-03", 65),
      log("2026-08-05", 70),
    ]);
    expect(summary.bestLoadKg).toBe(70);
    expect(summary.isPersonalRecord).toBe(true);
  });

  it("não marca recorde quando a última só empata o melhor", () => {
    const summary = computeLoadProgression([
      log("2026-08-01", 70),
      log("2026-08-05", 70),
    ]);
    expect(summary.isPersonalRecord).toBe(false);
  });

  it("não marca recorde quando o melhor ficou no passado", () => {
    const summary = computeLoadProgression([
      log("2026-08-01", 80),
      log("2026-08-05", 70),
    ]);
    expect(summary.bestLoadKg).toBe(80);
    expect(summary.isPersonalRecord).toBe(false);
  });

  it("não considera recorde uma única sessão", () => {
    const summary = computeLoadProgression([log("2026-08-01", 60)]);
    expect(summary.isPersonalRecord).toBe(false);
    expect(summary.deltaKg).toBe(0);
  });

  it("soma o volume com uma casa decimal", () => {
    const summary = computeLoadProgression([
      log("2026-08-01", 22.5, 1),
      log("2026-08-01", 22.5, 2),
      log("2026-08-01", 20.1, 3),
    ]);
    expect(summary.points[0]!.volumeKg).toBe(65.1);
  });
});
