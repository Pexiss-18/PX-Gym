import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractedAssessmentSchema } from "@/lib/schemas/assessment";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = extractedAssessmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.issues }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("body_assessments")
    .update({ extracted_data: parsed.data, status: "reviewed" })
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Avaliação não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ assessment: updated });
}
