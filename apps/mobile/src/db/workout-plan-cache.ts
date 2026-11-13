import { eq } from "drizzle-orm";
import type { WorkoutPlan, WorkoutPlanCache } from "@px/core";
import type { Db } from "./index";
import { workoutPlanCache } from "./schema";

type Payload = Omit<WorkoutPlan, "createdAt"> & { createdAt: string };

/** Implementação SQLite do port WorkoutPlanCache: o treino ativo em JSON. */
export class DrizzleWorkoutPlanCache implements WorkoutPlanCache {
  constructor(private readonly db: Db) {}

  async get(userId: string): Promise<WorkoutPlan | null> {
    const [row] = await this.db
      .select()
      .from(workoutPlanCache)
      .where(eq(workoutPlanCache.userId, userId));
    if (!row) return null;
    const payload = JSON.parse(row.payload) as Payload;
    return { ...payload, createdAt: new Date(payload.createdAt) };
  }

  async put(plan: WorkoutPlan): Promise<void> {
    const payload = JSON.stringify({ ...plan, createdAt: plan.createdAt.toISOString() });
    await this.db
      .insert(workoutPlanCache)
      .values({ userId: plan.userId, planId: plan.id, payload, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: workoutPlanCache.userId,
        set: { planId: plan.id, payload, updatedAt: new Date() },
      });
  }

  async clear(userId: string): Promise<void> {
    await this.db.delete(workoutPlanCache).where(eq(workoutPlanCache.userId, userId));
  }
}
