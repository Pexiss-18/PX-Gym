import { useMemo } from "react";
import { and, eq, ne } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import {
  computeLoadProgression,
  computeStreakDays,
  computeWeekActivity,
  type LoadProgressionSummary,
  type WeekActivityDay,
} from "@px/core";
import { db } from "@/db";
import { setLogs } from "@/db/schema";
import { rowToSetLog } from "@/db/set-log-repository";
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

/** Dias distintos com treino registrado — base da streak e da faixa semanal. */
function useSessionDates(): string[] {
  const { data } = useLiveQuery(
    db
      .selectDistinct({ sessionDate: setLogs.sessionDate })
      .from(setLogs)
      .where(ne(setLogs.syncStatus, "deleted")),
  );
  return useMemo(() => (data ?? []).map((d) => d.sessionDate), [data]);
}

/** Streak real: dias consecutivos com pelo menos uma série registrada. */
export function useStreakDays(): number {
  const dates = useSessionDates();
  return useMemo(() => computeStreakDays(dates, todayIsoDate()), [dates]);
}

/** Últimos 7 dias com marcação de treino, pra faixa semanal do dashboard. */
export function useWeekActivity(): WeekActivityDay[] {
  const dates = useSessionDates();
  return useMemo(() => computeWeekActivity(dates, todayIsoDate()), [dates]);
}

/**
 * Progressão de carga de um exercício, ao vivo: marcar uma série já move a
 * curva, porque o useLiveQuery reexecuta quando o SQLite muda.
 */
export function useLoadProgression(exerciseId: string): LoadProgressionSummary {
  const { data } = useLiveQuery(
    db
      .select()
      .from(setLogs)
      .where(
        and(
          eq(setLogs.exerciseId, exerciseId),
          ne(setLogs.syncStatus, "deleted"),
        ),
      ),
    [exerciseId],
  );
  return useMemo(
    () => computeLoadProgression((data ?? []).map(rowToSetLog)),
    [data],
  );
}
