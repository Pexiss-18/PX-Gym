import type {
  AssessmentSource,
  AssessmentStatus,
  ExtractedAssessment,
  MacroTarget,
  MicroTarget,
  Nivel,
  Objetivo,
  PlanDay,
  RegiaoSensivel,
  Sexo,
} from "@px/core";

/** Linhas das tabelas do Supabase (espelham supabase/migrations). */

export type BodyAssessmentRow = {
  id: string;
  user_id: string;
  pdf_path: string | null;
  source: AssessmentSource;
  status: AssessmentStatus;
  extracted_data: ExtractedAssessment | null;
  error_message: string | null;
  created_at: string;
};

export type NutritionPlanRow = {
  id: string;
  assessment_id: string;
  user_id: string;
  calories_target: number;
  macros: { protein: MacroTarget; carbs: MacroTarget; fat: MacroTarget };
  micros: MicroTarget[];
  diet_guidance: string;
  model: string;
  created_at: string;
};

/** Registro de série vindo do mobile (tabela criada na migration 0002). */
export type SetLogRow = {
  id: string;
  user_id: string;
  session_date: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  target_reps: number;
  previous_load_kg: number;
  load_kg: number;
  completed_at: string;
};

export type ProgressPhotoRow = {
  id: string;
  user_id: string;
  storage_path: string;
  taken_at: string;
  note: string | null;
  created_at: string;
};

/** Perfil de treino (migration 0004). */
export type TrainingProfileRow = {
  user_id: string;
  sex: Sexo;
  birth_date: string;
  height_cm: number | string;
  goal: Objetivo;
  level: Nivel;
  days_per_week: number;
  minutes_per_session: number;
  restrictions: string;
  sensitive_regions: RegiaoSensivel[];
  unavailable_exercises: string[];
  disliked_foods: string[];
  updated_at: string;
};

/** Treino gerado pela IA (migration 0004); só um ativo por pessoa. */
export type WorkoutPlanRow = {
  id: string;
  user_id: string;
  name: string;
  rationale: string;
  days: PlanDay[];
  sources: string[];
  created_at: string;
};

export const BUCKETS = {
  assessments: "assessments",
} as const;
