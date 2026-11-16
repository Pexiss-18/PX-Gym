import {
  BusinessRuleError,
  type ActiveWorkoutPlanSource,
  type PlanDay,
  type PlanGenerationGateway,
  type PlanGenerationRequest,
  type TrainingProfile,
  type TrainingProfileRepository,
  type WorkoutGenerationOutcome,
  type WorkoutPlan,
} from "@px/core";
import type { PxSupabaseClient } from "../client";
import type { TrainingProfileRow, WorkoutPlanRow } from "../types";

export function toTrainingProfile(row: TrainingProfileRow): TrainingProfile {
  return {
    userId: row.user_id,
    sex: row.sex,
    birthDate: row.birth_date,
    // numeric(5,1) chega como texto pelo PostgREST
    heightCm: Number(row.height_cm),
    goal: row.goal,
    level: row.level,
    daysPerWeek: row.days_per_week,
    minutesPerSession: row.minutes_per_session,
    restrictions: row.restrictions,
    sensitiveRegions: row.sensitive_regions,
    unavailableExercises: row.unavailable_exercises,
    dislikedFoods: row.disliked_foods,
  };
}

export function toWorkoutPlan(row: WorkoutPlanRow): WorkoutPlan {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    rationale: row.rationale,
    days: row.days,
    sources: row.sources,
    createdAt: new Date(row.created_at),
  };
}

/** Perfil de treino na tabela user_profiles (migration 0004). */
export class SupabaseTrainingProfileRepository implements TrainingProfileRepository {
  constructor(private readonly client: PxSupabaseClient) {}

  async get(userId: string): Promise<TrainingProfile | null> {
    const { data, error } = await this.client
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? toTrainingProfile(data as TrainingProfileRow) : null;
  }

  async save(profile: TrainingProfile): Promise<void> {
    const { error } = await this.client.from("user_profiles").upsert(
      {
        user_id: profile.userId,
        sex: profile.sex,
        birth_date: profile.birthDate,
        height_cm: profile.heightCm,
        goal: profile.goal,
        level: profile.level,
        days_per_week: profile.daysPerWeek,
        minutes_per_session: profile.minutesPerSession,
        restrictions: profile.restrictions,
        sensitive_regions: profile.sensitiveRegions,
        unavailable_exercises: profile.unavailableExercises,
        disliked_foods: profile.dislikedFoods,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
  }
}

/** Treino ativo na tabela workout_plans (só um por pessoa). */
export class SupabaseWorkoutPlanRepository implements ActiveWorkoutPlanSource {
  constructor(private readonly client: PxSupabaseClient) {}

  async get(userId: string): Promise<WorkoutPlan | null> {
    const { data, error } = await this.client
      .from("workout_plans")
      .select("id, user_id, name, rationale, days, sources, created_at")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle();
    if (error) throw error;
    return data ? toWorkoutPlan(data as WorkoutPlanRow) : null;
  }
}

type GenerateWorkoutResponse =
  | { status: "queued"; generationId: string }
  | {
      status: "done";
      workoutPlanId: string;
      workout: { name: string; rationale: string; days: PlanDay[] };
      sources: string[];
    };

/**
 * Recusa da generate-plan (4xx: limite, perfil incompleto, avaliação não
 * revisada, nada pra mudar) vira BusinessRuleError com a mensagem do
 * servidor, que já é escrita pra pessoa. O resto (5xx, rede) passa como erro
 * comum. `context` é a Response do FunctionsHttpError.
 */
async function translate(error: unknown): Promise<Error> {
  const response = (error as { context?: unknown }).context;
  if (response instanceof Response) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    const message = body?.error ?? `generate-plan respondeu ${response.status}`;
    return response.status >= 400 && response.status < 500
      ? new BusinessRuleError(message)
      : new Error(message);
  }
  return error instanceof Error ? error : new Error(String(error));
}

/** Gera o treino pela Edge Function generate-plan (Gemini + acervo científico). */
export class SupabasePlanGenerationGateway implements PlanGenerationGateway {
  constructor(private readonly client: PxSupabaseClient) {}

  async generateWorkout(
    userId: string,
    request: PlanGenerationRequest,
  ): Promise<WorkoutGenerationOutcome> {
    // pedido retomado já sabe a parte; os outros dizem que é o treino
    const body = "generationId" in request ? request : { ...request, part: "workout" };
    const { data, error } = await this.client.functions.invoke<GenerateWorkoutResponse>(
      "generate-plan",
      { body },
    );
    if (error) throw await translate(error);
    if (!data) throw new Error("generate-plan respondeu vazio");
    if (data.status === "queued") return { status: "queued", generationId: data.generationId };
    return {
      status: "done",
      plan: {
        id: data.workoutPlanId,
        userId,
        name: data.workout.name,
        rationale: data.workout.rationale,
        days: data.workout.days,
        sources: data.sources,
        createdAt: new Date(),
      },
    };
  }
}
