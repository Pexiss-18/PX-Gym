import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractedAssessmentSchema } from "@/lib/schemas/assessment";
import { generateNutritionPlan } from "@/lib/anthropic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: assessment, error: fetchError } = await supabase
    .from("body_assessments")
    .select("id, status, extracted_data")
    .eq("id", id)
    .single();

  if (fetchError || !assessment) {
    return NextResponse.json({ error: "Avaliação não encontrada." }, { status: 404 });
  }
  if (assessment.status !== "reviewed") {
    return NextResponse.json(
      { error: "Revise os dados extraídos antes de gerar o plano." },
      { status: 400 },
    );
  }

  const extracted = extractedAssessmentSchema.safeParse(assessment.extracted_data);
  if (!extracted.success) {
    return NextResponse.json({ error: "Dados da avaliação inválidos." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const goal = typeof body?.goal === "string" && body.goal.trim() ? body.goal.trim() : "saúde geral e composição corporal";

  try {
    const plan = await generateNutritionPlan(extracted.data, { goal });

    const { data: saved, error: insertError } = await supabase
      .from("nutrition_plans")
      .insert({
        assessment_id: id,
        user_id: user.id,
        calories_target: plan.caloriesTarget,
        macros: plan.macros,
        micros: plan.micros,
        diet_guidance: plan.dietGuidance,
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      })
      .select()
      .single();

    if (insertError || !saved) {
      throw new Error(insertError?.message ?? "Falha ao salvar o plano.");
    }

    return NextResponse.json({ plan: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao gerar o plano.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
