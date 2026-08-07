import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { Load, SetLog, type SetLogRepository } from "@px/core";
import type { Db } from "./index";
import { setLogs, type SetLogRow } from "./schema";

/** Linha do SQLite → entidade do domínio. Exportado pros hooks de useLiveQuery. */
export function rowToSetLog(row: SetLogRow): SetLog {
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

  async byId(id: string): Promise<SetLog | null> {
    const rows = await this.db
      .select()
      .from(setLogs)
      .where(eq(setLogs.id, id))
      .limit(1);
    return rows[0] ? rowToSetLog(rows[0]) : null;
  }

  async pending(): Promise<SetLog[]> {
    const rows = await this.db
      .select()
      .from(setLogs)
      .where(eq(setLogs.syncStatus, "pending"))
      .orderBy(setLogs.completedAt);
    return rows.map(rowToSetLog);
  }

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(setLogs)
      .set({ syncStatus: "synced" })
      .where(inArray(setLogs.id, ids));
  }

  async markDeleted(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(setLogs)
      .set({ syncStatus: "deleted" })
      .where(inArray(setLogs.id, ids));
  }

  async deletedIds(): Promise<string[]> {
    const rows = await this.db
      .select({ id: setLogs.id })
      .from(setLogs)
      .where(eq(setLogs.syncStatus, "deleted"));
    return rows.map((r) => r.id);
  }

  async remove(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db.delete(setLogs).where(inArray(setLogs.id, ids));
  }

  async lastLoadKgForExercise(exerciseId: string): Promise<number | null> {
    const rows = await this.db
      .select({ loadKg: setLogs.loadKg })
      .from(setLogs)
      .where(
        and(
          eq(setLogs.exerciseId, exerciseId),
          ne(setLogs.syncStatus, "deleted"),
        ),
      )
      .orderBy(desc(setLogs.completedAt))
      .limit(1);
    return rows[0]?.loadKg ?? null;
  }

  async byExercise(exerciseId: string): Promise<SetLog[]> {
    const rows = await this.db
      .select()
      .from(setLogs)
      .where(
        and(
          eq(setLogs.exerciseId, exerciseId),
          ne(setLogs.syncStatus, "deleted"),
        ),
      )
      .orderBy(setLogs.completedAt);
    return rows.map(rowToSetLog);
  }

  async bySessionDate(sessionDate: string): Promise<SetLog[]> {
    const rows = await this.db
      .select()
      .from(setLogs)
      .where(
        and(
          eq(setLogs.sessionDate, sessionDate),
          ne(setLogs.syncStatus, "deleted"),
        ),
      )
      .orderBy(setLogs.completedAt);
    return rows.map(rowToSetLog);
  }
}
