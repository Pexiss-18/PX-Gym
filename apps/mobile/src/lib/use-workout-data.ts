import { useMemo } from "react";
import { and, eq, ne } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { computeStreakDays } from "@px/core";
import { db } from "@/db";
import { setLogs } from "@/db/schema";
import { todayIsoDate } from "./workout";

/*
 * Dados de treino ao vivo: useLiveQuery reexecuta quando o SQLite muda
 * (enableChangeListener ligado no openDatabaseSync), então marcar uma série
 * na tela do exercício atualiza progresso/streak em todas as telas.
 */

/** Registros de série de hoje, direto do SQLite. */
export function useTodaySetLogs() {
  const { data } = useLiveQuery(
    db
      .select()
      .from(setLogs)
      .where(
        and(
          eq(setLogs.sessionDate, todayIsoDate()),
          ne(setLogs.syncStatus, "deleted"),
        ),
      ),
  );
  return data ?? [];
}

/** Séries feitas hoje por exercício (exerciseId → quantidade). */
export function useTodayDoneByExercise(): Map<string, number> {
  const rows = useTodaySetLogs();
  return useMemo(() => {
    const done = new Map<string, number>();
    for (const row of rows) {
      done.set(row.exerciseId, (done.get(row.exerciseId) ?? 0) + 1);
    }
    return done;
  }, [rows]);
}

/** Streak real: dias consecutivos com pelo menos uma série registrada. */
export function useStreakDays(): number {
  const { data } = useLiveQuery(
    db
      .selectDistinct({ sessionDate: setLogs.sessionDate })
      .from(setLogs)
      .where(ne(setLogs.syncStatus, "deleted")),
  );
  return useMemo(
    () =>
      computeStreakDays(
        (data ?? []).map((d) => d.sessionDate),
        todayIsoDate(),
      ),
    [data],
  );
}
