export type BodyHistoryPoint = {
  date: string;
  weightKg: number;
  bodyFatPct: number;
};

export type Measurement = {
  label: string;
  valueCm: number;
  deltaCm: number;
};

export type BodyMetrics = {
  weightKg: number;
  weightDeltaKg: number;
  bodyFatPct: number;
  bodyFatDeltaPct: number;
  muscleMassKg: number;
  muscleMassDeltaKg: number;
  lastAssessment: string;
  nextAssessment: string;
  measurements: Measurement[];
  history: BodyHistoryPoint[];
};

export type ExerciseSet = {
  setNumber: number;
  targetReps: number;
  targetLoadKg: number;
  previousLoadKg: number;
  completed: boolean;
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  restSeconds: number;
  sets: ExerciseSet[];
};

export type LiveSet = {
  setNumber: number;
  targetReps: number;
  previousLoadKg: number;
  currentLoadKg: number;
  completed: boolean;
};

export type WorkoutDay = {
  id: string;
  label: string;
  name: string;
  focus: string;
  estimatedMinutes: number;
  exercises: Exercise[];
};

export type MacroKey = "protein" | "carbs" | "fat";

export type MacroGoal = {
  key: MacroKey;
  label: string;
  currentG: number;
  targetG: number;
  caloriesPerG: number;
};

export type MealItem = {
  name: string;
  qty: string;
};

export type Meal = {
  id: string;
  name: string;
  time: string;
  logged: boolean;
  calories: number;
  items: MealItem[];
  macros: Record<MacroKey, number>;
};

export type AssessmentStatus = "processing" | "pending_review" | "reviewed" | "error";

export type BodyAssessmentRow = {
  id: string;
  user_id: string;
  pdf_path: string;
  status: AssessmentStatus;
  extracted_data: unknown;
  error_message: string | null;
  created_at: string;
};

export type MacroTarget = {
  grams: number;
  rationale: string;
};

export type MicroTarget = {
  name: string;
  targetAmount: number;
  unit: string;
  rationale: string;
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

export type NutritionDay = {
  caloriesTarget: number;
  caloriesConsumed: number;
  waterMl: { current: number; target: number };
  macros: MacroGoal[];
  meals: Meal[];
};
