import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { extractBodyAssessment } from "@/lib/anthropic";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("body_assessments")
    .select("id, status, extracted_data, created_at, nutrition_plans(id, created_at)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assessments: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "O arquivo excede 15MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdfPath = `${user.id}/${randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("assessments")
    .upload(pdfPath, bytes, { contentType: "application/pdf" });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: assessment, error: insertError } = await supabase
    .from("body_assessments")
    .insert({ user_id: user.id, pdf_path: pdfPath, status: "processing" })
    .select()
    .single();

  if (insertError || !assessment) {
    return NextResponse.json(
      { error: insertError?.message ?? "Falha ao registrar a avaliação." },
      { status: 500 },
    );
  }

  try {
    const pdfBase64 = Buffer.from(bytes).toString("base64");
    const extractedData = await extractBodyAssessment(pdfBase64);

    const { data: updated, error: updateError } = await supabase
      .from("body_assessments")
      .update({ extracted_data: extractedData, status: "pending_review" })
      .eq("id", assessment.id)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Falha ao salvar os dados extraídos.");
    }

    return NextResponse.json({ assessment: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao ler a avaliação.";
    await supabase
      .from("body_assessments")
      .update({ status: "error", error_message: message })
      .eq("id", assessment.id);

    return NextResponse.json({ error: message, assessmentId: assessment.id }, { status: 502 });
  }
}
