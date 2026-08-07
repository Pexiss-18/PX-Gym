import { desc, eq, inArray } from "drizzle-orm";
import { Load, SetLog, type SetLogRepository } from "@px/core";
import type { Db } from "./index";
import { setLogs, type SetLogRow } from "./schema";

function toEntity(row: SetLogRow): SetLog {
  return SetLog.restore({
    id: row.id,
    sessionDate: row.sessionDate,
    exerciseId: row.exerciseId,
    exerciseName: row.exerciseName,
    setNumber: row.setNumber,
    targetReps: row.targetReps,
    previousLoad: Load.fromKg(row.previousLoadKg),
    load: Load.fromKg(row.loadKg),
    completedAt: row.completedAt,
    syncStatus: row.syncStatus,
  });
}

/** Implementação SQLite/Drizzle do port SetLogRepository — o lado local do offline-first. */
export class DrizzleSetLogRepository implements SetLogRepository {
  constructor(private readonly db: Db) {}

  async save(log: SetLog): Promise<void> {
    const row = {
      id: log.id,
      sessionDate: log.sessionDate,
      exerciseId: log.exerciseId,
      exerciseName: log.exerciseName,
      setNumber: log.setNumber,
      targetReps: log.targetReps,
      previousLoadKg: log.previousLoad.kg,
      loadKg: log.load.kg,
      completedAt: log.completedAt,
      syncStatus: log.syncStatus,
    };
    await this.db
      .insert(setLogs)
      .values(row)
      .onConflictDoUpdate({ target: setLogs.id, set: row });
  }

  async pending(): Promise<SetLog[]> {
    const rows = await this.db
      .select()
      .from(setLogs)
      .where(eq(setLogs.syncStatus, "pending"))
      .orderBy(setLogs.completedAt);
    return rows.map(toEntity);
  }

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(setLogs)
      .set({ syncStatus: "synced" })
      .where(inArray(setLogs.id, ids));
  }

  async remove(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db.delete(setLogs).where(inArray(setLogs.id, ids));
  }

  async lastLoadKgForExercise(exerciseId: string): Promise<number | null> {
    const rows = await this.db
      .select({ loadKg: setLogs.loadKg })
      .from(setLogs)
      .where(eq(setLogs.exerciseId, exerciseId))
      .orderBy(desc(setLogs.completedAt))
      .limit(1);
    return rows[0]?.loadKg ?? null;
  }

  async bySessionDate(sessionDate: string): Promise<SetLog[]> {
    const rows = await this.db
      .select()
      .from(setLogs)
      .where(eq(setLogs.sessionDate, sessionDate))
      .orderBy(setLogs.completedAt);
    return rows.map(toEntity);
  }
}
