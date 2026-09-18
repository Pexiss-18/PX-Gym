import { Load, SetLog } from "@px/core";
import { DrizzleSetLogRepository } from "../set-log-repository";
import { createTestDb } from "./sqlite-test-db";

function makeLog(
  id: string,
  overrides: Partial<{
    exerciseId: string;
    sessionDate: string;
    setNumber: number;
    loadKg: number;
    completedAt: Date;
  }> = {},
): SetLog {
  return SetLog.create({
    id,
    sessionDate: overrides.sessionDate ?? "2026-09-11",
    exerciseId: overrides.exerciseId ?? "supino",
    exerciseName: "Supino reto",
    setNumber: overrides.setNumber ?? 1,
    targetReps: 8,
    previousLoad: Load.fromKg(60),
    load: Load.fromKg(overrides.loadKg ?? 62.5),
    completedAt: overrides.completedAt ?? new Date("2026-09-11T19:00:00Z"),
  });
}

describe("DrizzleSetLogRepository (SQLite real + migrations do app)", () => {
  let repo: DrizzleSetLogRepository;
  let close: () => void;

  beforeEach(() => {
    const testDb = createTestDb();
    repo = new DrizzleSetLogRepository(testDb.db);
    close = testDb.close;
  });
  afterEach(() => close());

  it("save + byId faz a volta completa linha ↔ entidade", async () => {
    const log = makeLog("a");
    await repo.save(log);

    const loaded = await repo.byId("a");

    expect(loaded).not.toBeNull();
    expect(loaded!.load.kg).toBe(62.5);
    expect(loaded!.previousLoad.kg).toBe(60);
    expect(loaded!.completedAt.toISOString()).toBe("2026-09-11T19:00:00.000Z");
    expect(loaded!.syncStatus).toBe("pending");
    expect(await repo.byId("nao-existe")).toBeNull();
  });

  it("save de novo com o mesmo id atualiza em vez de duplicar", async () => {
    await repo.save(makeLog("a"));
    await repo.save((await repo.byId("a"))!.markSynced());

    expect(await repo.pending()).toHaveLength(0);
    expect((await repo.byId("a"))!.syncStatus).toBe("synced");
  });

  it("pending lista só o que falta enviar, na ordem de conclusão", async () => {
    await repo.save(makeLog("b", { completedAt: new Date("2026-09-11T19:05:00Z") }));
    await repo.save(makeLog("a", { completedAt: new Date("2026-09-11T19:00:00Z") }));
    await repo.save(makeLog("c"));
    await repo.markSynced(["c"]);

    expect((await repo.pending()).map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("tombstone some das leituras mas continua visível pro sync", async () => {
    await repo.save(makeLog("a", { setNumber: 1, loadKg: 60 }));
    await repo.save(
      makeLog("b", {
        setNumber: 2,
        loadKg: 70,
        completedAt: new Date("2026-09-11T19:10:00Z"),
      }),
    );
    await repo.markSynced(["a", "b"]);
    await repo.markDeleted(["b"]);

    expect(await repo.deletedIds()).toEqual(["b"]);
    expect((await repo.bySessionDate("2026-09-11")).map((l) => l.id)).toEqual([
      "a",
    ]);
    expect((await repo.byExercise("supino")).map((l) => l.id)).toEqual(["a"]);
    // a carga do tombstone (70) não pode virar "carga anterior"
    expect(await repo.lastLoadKgForExercise("supino")).toBe(60);
    expect(await repo.pending()).toHaveLength(0);
  });

  it("remove apaga de vez", async () => {
    await repo.save(makeLog("a"));
    await repo.markDeleted(["a"]);
    await repo.remove(["a"]);

    expect(await repo.byId("a")).toBeNull();
    expect(await repo.deletedIds()).toEqual([]);
  });

  it("lastLoadKgForExercise pega a mais recente do exercício certo", async () => {
    await repo.save(
      makeLog("velha", { loadKg: 50, completedAt: new Date("2026-09-01T10:00:00Z") }),
    );
    await repo.save(
      makeLog("nova", { loadKg: 65, completedAt: new Date("2026-09-10T10:00:00Z") }),
    );
    await repo.save(
      makeLog("outro", {
        exerciseId: "agachamento",
        loadKg: 120,
        completedAt: new Date("2026-09-11T10:00:00Z"),
      }),
    );

    expect(await repo.lastLoadKgForExercise("supino")).toBe(65);
    expect(await repo.lastLoadKgForExercise("remada")).toBeNull();
  });

  it("listas vazias nas operações em lote são no-op", async () => {
    await repo.save(makeLog("a"));
    await repo.markSynced([]);
    await repo.markDeleted([]);
    await repo.remove([]);

    expect(await repo.pending()).toHaveLength(1);
  });
});
