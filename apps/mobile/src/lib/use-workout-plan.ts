import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useFocusEffect } from "expo-router";
import { ne } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import {
  indiceDoTreinoDeHoje,
  montarTreinoDoDia,
  type Resultado,
  type Workout,
  type WorkoutGenerationOutcome,
  type WorkoutPlan,
} from "@px/core";
import { useAuth } from "@/adapters/hooks/useAuth";
import { db } from "@/db";
import { setLogs } from "@/db/schema";
import { rowToSetLog } from "@/db/set-log-repository";
import { generateWorkoutPlanUseCase, loadActiveWorkoutPlanUseCase } from "./plans";
import { todayIsoDate } from "./workout";

/*
 * Estado do treino ativo compartilhado entre a aba Treino, a tela do
 * exercício, o dashboard e o scanner: quem gerar ou mudar o treino avisa
 * aqui e todas as telas atualizam juntas.
 */

type PlanState = {
  status: "loading" | "ready";
  plan: WorkoutPlan | null;
  /** Dia escolhido na aba Treino; null = o dia sugerido pelo histórico. */
  chosenDay: number | null;
  /** Pedido que ficou na fila porque a cota da IA acabou. */
  queuedGenerationId: string | null;
};

let state: PlanState = { status: "loading", plan: null, chosenDay: null, queuedGenerationId: null };
const listeners = new Set<() => void>();

function update(patch: Partial<PlanState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Treino novo (gerado ou mudado): todas as telas passam a mostrá-lo. */
export function setActivePlan(plan: WorkoutPlan) {
  update({ status: "ready", plan, chosenDay: null, queuedGenerationId: null });
}

export function setQueuedGeneration(generationId: string | null) {
  update({ queuedGenerationId: generationId });
}

export function chooseDay(index: number | null) {
  update({ chosenDay: index });
}

/** Treino ativo, recarregado a cada vez que a tela ganha foco. */
export function useActiveWorkoutPlan(): PlanState {
  const { sessao } = useAuth();
  const userId = sessao?.usuario.id;
  const current = useSyncExternalStore(subscribe, () => state);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;
      loadActiveWorkoutPlanUseCase
        .execute(userId)
        .then((plan) => {
          if (!active) return;
          // não desfaz a escolha de dia se o treino continua o mesmo
          const mesmo = plan?.id === state.plan?.id;
          update({ status: "ready", plan, chosenDay: mesmo ? state.chosenDay : null });
        })
        .catch(() => {
          if (active) update({ status: "ready" });
        });
      return () => {
        active = false;
      };
    }, [userId]),
  );

  return current;
}

/** Todas as séries registradas (sem tombstones), ao vivo do SQLite. */
function useSetLogHistory() {
  const { data } = useLiveQuery(db.select().from(setLogs).where(ne(setLogs.syncStatus, "deleted")));
  return useMemo(() => (data ?? []).map(rowToSetLog), [data]);
}

export type TodayWorkout = {
  status: PlanState["status"];
  plan: WorkoutPlan | null;
  /** Dia do plano na tela (o escolhido ou o sugerido). */
  dayIndex: number;
  /** Dia que o histórico sugere para hoje. */
  suggestedDay: number;
  workout: Workout | null;
  queuedGenerationId: string | null;
};

/** O treino do dia montado a partir do plano ativo e do histórico de cargas. */
export function useTodayWorkout(): TodayWorkout {
  const planState = useActiveWorkoutPlan();
  const history = useSetLogHistory();
  const { plan, chosenDay } = planState;

  return useMemo(() => {
    const hoje = todayIsoDate();
    if (!plan || plan.days.length === 0) {
      return { ...planState, dayIndex: 0, suggestedDay: 0, workout: null };
    }
    const suggestedDay = indiceDoTreinoDeHoje(plan, history, hoje);
    const dayIndex = chosenDay !== null && chosenDay < plan.days.length ? chosenDay : suggestedDay;
    return {
      status: planState.status,
      plan,
      dayIndex,
      suggestedDay,
      workout: montarTreinoDoDia(plan, dayIndex, history, hoje),
      queuedGenerationId: planState.queuedGenerationId,
    };
  }, [planState, plan, chosenDay, history]);
}

/**
 * Treino de um exercício específico: o de hoje, se ele estiver nele, ou o do
 * dia do plano que o contém (o QR de um aparelho de outro dia também abre).
 */
export function useWorkoutWithExercise(exerciseId: string): Workout | null {
  const today = useTodayWorkout();
  const history = useSetLogHistory();
  return useMemo(() => {
    if (today.workout?.exercises.some((e) => e.id === exerciseId)) return today.workout;
    const plan = today.plan;
    if (!plan) return null;
    const index = plan.days.findIndex((d) => d.exercises.some((e) => e.exerciseId === exerciseId));
    return index >= 0 ? montarTreinoDoDia(plan, index, history, todayIsoDate()) : null;
  }, [today, history, exerciseId]);
}

export type GenerationError = {
  message: string;
  /** O que a pessoa precisa fazer antes, quando o motivo é conhecido. */
  fix: "profile" | "assessment" | null;
};

/**
 * Ações da geração por IA. Quem chama vê `busy` enquanto a Edge Function
 * trabalha (pode levar até um minuto) e `error` com a mensagem pronta.
 */
export function useWorkoutGeneration() {
  const { sessao } = useAuth();
  const userId = sessao?.usuario.id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<GenerationError | null>(null);

  const run = useCallback(
    async (call: () => Promise<Resultado<WorkoutGenerationOutcome>>): Promise<boolean> => {
      if (!userId || busy) return false;
      setBusy(true);
      setError(null);
      try {
        const r = await call();
        if (!r.ok) {
          const message = r.erro.mensagem;
          setError({
            message,
            fix: /perfil/i.test(message) ? "profile" : /avalia/i.test(message) ? "assessment" : null,
          });
          return false;
        }
        if (r.valor.status === "done") setActivePlan(r.valor.plan);
        else setQueuedGeneration(r.valor.generationId);
        return true;
      } finally {
        setBusy(false);
      }
    },
    [userId, busy],
  );

  return {
    busy,
    error,
    clearError: () => setError(null),
    generate: () => run(() => generateWorkoutPlanUseCase.generate(userId!)),
    requestChange: (feedback: string) => run(() => generateWorkoutPlanUseCase.requestChange(userId!, feedback)),
    resume: (generationId: string) => run(() => generateWorkoutPlanUseCase.resume(userId!, generationId)),
  };
}
