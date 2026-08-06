import type { BodyAssessment, NutritionPlan, SetLog } from "@px/core";
import type {
  BodyAssessmentRow,
  NutritionPlanRow,
  SetLogRow,
} from "./types";

export function toBodyAssessment(row: BodyAssessmentRow): BodyAssessment {
  return {
    id: row.id,
    userId: row.user_id,
    pdfPath: row.pdf_path,
    status: row.status,
    extracted: row.extracted_data,
    errorMessage: row.error_message,
    createdAt: new Date(row.created_at),
  };
}

export function toNutritionPlan(row: NutritionPlanRow): NutritionPlan {
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    userId: row.user_id,
    caloriesTarget: row.calories_target,
    macros: row.macros,
    micros: row.micros,
    dietGuidance: row.diet_guidance,
    model: row.model,
    createdAt: new Date(row.created_at),
  };
}

export function toSetLogRow(log: SetLog, userId: string): SetLogRow {
  return {
    id: log.id,
    user_id: userId,
    session_date: log.sessionDate,
    exercise_id: log.exerciseId,
    exercise_name: log.exerciseName,
    set_number: log.setNumber,
    target_reps: log.targetReps,
    previous_load_kg: log.previousLoad.kg,
    load_kg: log.load.kg,
    completed_at: log.completedAt.toISOString(),
  };
}
