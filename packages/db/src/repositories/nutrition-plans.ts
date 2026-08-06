import type { NutritionPlan, NutritionPlanRepository } from "@px/core";
import type { PxSupabaseClient } from "../client";
import type { NutritionPlanRow } from "../types";
import { toNutritionPlan } from "../mappers";

/** Implementação Supabase do port NutritionPlanRepository do core. */
export class SupabaseNutritionPlanRepository
  implements NutritionPlanRepository
{
  constructor(private readonly client: PxSupabaseClient) {}

  async save(plan: NutritionPlan): Promise<void> {
    const { error } = await this.client.from("nutrition_plans").insert({
      id: plan.id,
      assessment_id: plan.assessmentId,
      user_id: plan.userId,
      calories_target: plan.caloriesTarget,
      macros: plan.macros,
      micros: plan.micros,
      diet_guidance: plan.dietGuidance,
      model: plan.model,
      created_at: plan.createdAt.toISOString(),
    });
    if (error) throw error;
  }

  async latestForUser(userId: string): Promise<NutritionPlan | null> {
    const { data, error } = await this.client
      .from("nutrition_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toNutritionPlan(data as NutritionPlanRow) : null;
  }

  async byAssessment(assessmentId: string): Promise<NutritionPlan | null> {
    const { data, error } = await this.client
      .from("nutrition_plans")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toNutritionPlan(data as NutritionPlanRow) : null;
  }
}
