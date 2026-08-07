import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * Tabela local (SQLite) dos registros de série — a fonte da verdade durante o
 * treino. Espelha o SetLog do domínio; sync_status controla o que ainda falta
 * empurrar pro Supabase (tabela set_logs, migration 0002).
 */
export const setLogs = sqliteTable(
  "set_logs",
  {
    id: text("id").primaryKey(),
    sessionDate: text("session_date").notNull(),
    exerciseId: text("exercise_id").notNull(),
    exerciseName: text("exercise_name").notNull(),
    setNumber: integer("set_number").notNull(),
    targetReps: integer("target_reps").notNull(),
    previousLoadKg: real("previous_load_kg").notNull(),
    loadKg: real("load_kg").notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }).notNull(),
    syncStatus: text("sync_status")
      .$type<"pending" | "synced">()
      .notNull()
      .default("pending"),
  },
  (t) => [
    index("set_logs_session_date_idx").on(t.sessionDate),
    index("set_logs_exercise_completed_idx").on(t.exerciseId, t.completedAt),
    index("set_logs_sync_status_idx").on(t.syncStatus),
  ],
);

export type SetLogRow = typeof setLogs.$inferSelect;
