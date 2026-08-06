import { RegisterSetUseCase } from "../use-cases/register-set";
import { FixedClock, InMemorySetLogs, SequenceIds } from "../testing/fakes";

const NOW = new Date("2026-08-06T18:30:00");

function makeUseCase() {
  const repo = new InMemorySetLogs();
  const useCase = new RegisterSetUseCase(
    repo,
    new FixedClock(NOW),
    new SequenceIds(),
  );
  return { repo, useCase };
}

describe("RegisterSetUseCase", () => {
  it("grava a série como pending com a data da sessão", async () => {
    const { repo, useCase } = makeUseCase();

    const { setLog, deltaKg } = await useCase.execute({
      exerciseId: "supino",
      exerciseName: "Supino reto",
      setNumber: 1,
      targetReps: 8,
      loadKg: 60,
    });

    expect(setLog.syncStatus).toBe("pending");
    expect(setLog.sessionDate).toBe("2026-08-06");
    expect(deltaKg).toBeNull(); // primeira vez no exercício: sem comparação
    expect(repo.logs).toHaveLength(1);
  });

  it("calcula o delta de progressão contra a última carga do exercício", async () => {
    const { useCase } = makeUseCase();

    await useCase.execute({
      exerciseId: "supino",
      exerciseName: "Supino reto",
      setNumber: 1,
      targetReps: 8,
      loadKg: 60,
    });
    const second = await useCase.execute({
      exerciseId: "supino",
      exerciseName: "Supino reto",
      setNumber: 2,
      targetReps: 8,
      loadKg: 62.5,
    });

    expect(second.deltaKg).toBe(2.5);
    expect(second.setLog.isProgress).toBe(true);
  });

  it("rejeita carga inválida sem gravar nada", async () => {
    const { repo, useCase } = makeUseCase();

    await expect(
      useCase.execute({
        exerciseId: "supino",
        exerciseName: "Supino reto",
        setNumber: 1,
        targetReps: 8,
        loadKg: -5,
      }),
    ).rejects.toThrow();
    expect(repo.logs).toHaveLength(0);
  });
});
