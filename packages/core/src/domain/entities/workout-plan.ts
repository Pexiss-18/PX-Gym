/** Um exercício do plano gerado pela IA (id do catálogo, séries e descanso). */
export type PlanExercise = {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  sets: number;
  /** Repetições alvo; no isométrico (prancha), segundos. */
  reps: number;
  restSeconds: number;
  notes: string;
};

/** Um dia do plano: "A — Peito e Tríceps". */
export type PlanDay = {
  label: string;
  name: string;
  focus: string;
  estimatedMinutes: number;
  exercises: PlanExercise[];
};

/**
 * Plano de treino ativo (tabela workout_plans), gerado pela Edge Function
 * generate-plan. Não traz cargas: elas saem do histórico de séries.
 */
export type WorkoutPlan = {
  id: string;
  userId: string;
  name: string;
  /** Por que essa divisão e esse volume servem à pessoa. */
  rationale: string;
  days: PlanDay[];
  /** Ids dos artigos do acervo que embasaram o plano. */
  sources: string[];
  createdAt: Date;
};
