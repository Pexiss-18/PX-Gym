import {
  GenerateWorkoutPlanUseCase,
  LoadActiveWorkoutPlanUseCase,
  SaveTrainingProfileUseCase,
} from "@px/core";
import {
  SupabasePlanGenerationGateway,
  SupabaseTrainingProfileRepository,
  SupabaseWorkoutPlanRepository,
} from "@px/db";
import { db } from "@/db";
import { DrizzleWorkoutPlanCache } from "@/db/workout-plan-cache";
import { assessmentRepository } from "./remote";
import { supabase } from "./supabase";
import { netInfoConnectivity, systemClock } from "./system";

/*
 * Composition root do treino gerado por IA: perfil e treino ativo no
 * Supabase, geração pela Edge Function generate-plan e a cópia do treino no
 * SQLite pra abrir sem internet.
 */

export const trainingProfileRepository = new SupabaseTrainingProfileRepository(supabase);

export const saveTrainingProfileUseCase = new SaveTrainingProfileUseCase(
  trainingProfileRepository,
  systemClock,
);

const workoutPlanCache = new DrizzleWorkoutPlanCache(db);

export const generateWorkoutPlanUseCase = new GenerateWorkoutPlanUseCase(
  assessmentRepository,
  trainingProfileRepository,
  new SupabasePlanGenerationGateway(supabase),
  workoutPlanCache,
  netInfoConnectivity,
);

export const loadActiveWorkoutPlanUseCase = new LoadActiveWorkoutPlanUseCase(
  new SupabaseWorkoutPlanRepository(supabase),
  workoutPlanCache,
  netInfoConnectivity,
);
