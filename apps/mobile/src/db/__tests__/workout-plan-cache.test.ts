import type { WorkoutPlan } from "@px/core";
import { DrizzleWorkoutPlanCache } from "../workout-plan-cache";
import { createTestDb } from "./sqlite-test-db";

const PLANO: WorkoutPlan = {
  id: "w-1",
  userId: "u1",
  name: "AB",
  rationale: "Dois dias.",
  sources: ["schoenfeld-2017-volume"],
  createdAt: new Date("2026-11-13T10:00:00Z"),
  days: [
    {
      label: "A",
      name: "Superior",
      focus: "Hipertrofia",
      estimatedMinutes: 50,
      exercises: [
        { exerciseId: "supino-reto", name: "Supino reto com barra", muscleGroup: "Peito", sets: 4, reps: 8, restSeconds: 120, notes: "" },
      ],
    },
  ],
};

describe("DrizzleWorkoutPlanCache (SQLite real)", () => {
  let cache: DrizzleWorkoutPlanCache;
  let close: () => void;

  beforeEach(() => {
    const testDb = createTestDb();
    cache = new DrizzleWorkoutPlanCache(testDb.db);
    close = testDb.close;
  });
  afterEach(() => close());

  it("guarda e devolve o plano igual, com a data", async () => {
    await cache.put(PLANO);
    expect(await cache.get("u1")).toEqual(PLANO);
  });

  it("um plano novo substitui o anterior da mesma pessoa", async () => {
    await cache.put(PLANO);
    await cache.put({ ...PLANO, id: "w-2", name: "ABC" });

    expect((await cache.get("u1"))?.id).toBe("w-2");
  });

  it("cada pessoa tem o seu; limpar apaga só o dela", async () => {
    await cache.put(PLANO);
    await cache.put({ ...PLANO, userId: "u2" });
    await cache.clear("u1");

    expect(await cache.get("u1")).toBeNull();
    expect((await cache.get("u2"))?.userId).toBe("u2");
  });
});
