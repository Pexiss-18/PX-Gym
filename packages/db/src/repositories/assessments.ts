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

  /** Avaliação digitada no app: sem PDF, já revisada (migration 0007). */
  async createManual(assessment: BodyAssessment): Promise<BodyAssessment> {
    const { data, error } = await this.client
      .from("body_assessments")
      .insert({
        id: assessment.id,
        user_id: assessment.userId,
        pdf_path: null,
        source: "manual",
        status: "reviewed",
        extracted_data: assessment.extracted,
        created_at: assessment.createdAt.toISOString(),
      })
      .select("*")
      .single();
    if (error) throw error;
    return toBodyAssessment(data as BodyAssessmentRow);
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
