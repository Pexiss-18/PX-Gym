import type { AssessmentRepository, BodyAssessment } from "@px/core";
import type { PxSupabaseClient } from "../client";
import type { BodyAssessmentRow } from "../types";
import { toBodyAssessment } from "../mappers";

/** Implementação Supabase do port AssessmentRepository do core. */
export class SupabaseAssessmentRepository implements AssessmentRepository {
  constructor(private readonly client: PxSupabaseClient) {}

  async byId(id: string): Promise<BodyAssessment | null> {
    const { data, error } = await this.client
      .from("body_assessments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toBodyAssessment(data as BodyAssessmentRow) : null;
  }

  async listByUser(userId: string): Promise<BodyAssessment[]> {
    const { data, error } = await this.client
      .from("body_assessments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as BodyAssessmentRow[]).map(toBodyAssessment);
  }

  async latestReviewed(userId: string): Promise<BodyAssessment | null> {
    const { data, error } = await this.client
      .from("body_assessments")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "reviewed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toBodyAssessment(data as BodyAssessmentRow) : null;
  }
}
