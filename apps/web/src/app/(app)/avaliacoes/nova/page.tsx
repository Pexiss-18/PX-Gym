"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { FileDrop } from "@/components/assessment/file-drop";
import { ReviewForm } from "@/components/assessment/review-form";
import { PlanResultCard } from "@/components/assessment/plan-result-card";
import type { ExtractedAssessment } from "@/lib/schemas/assessment";
import type { NutritionPlanRow } from "@/lib/types";

type Step = "upload" | "review" | "generating" | "plan";

export default function NovaAvaliacaoPage() {
  const [step, setStep] = useState<Step>("upload");
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedAssessment | null>(null);
  const [goal, setGoal] = useState("Hipertrofia");
  const [plan, setPlan] = useState<NutritionPlanRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/assessments", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? "Falha ao processar a avaliação.");

      setAssessmentId(json.assessment.id);
      setExtracted(json.assessment.extracted_data as ExtractedAssessment);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmReview() {
    if (!assessmentId || !extracted) return;
    setSavingReview(true);
    setError(null);

    try {
      const patchRes = await fetch(`/api/assessments/${assessmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extracted),
      });
      const patchJson = await patchRes.json();
      if (!patchRes.ok) throw new Error(patchJson.error ?? "Falha ao salvar a revisão.");

      setStep("generating");

      const planRes = await fetch(`/api/assessments/${assessmentId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      const planJson = await planRes.json();
      if (!planRes.ok) throw new Error(planJson.error ?? "Falha ao gerar o plano.");

      setPlan(planJson.plan as NutritionPlanRow);
      setStep("plan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
      setStep("review");
    } finally {
      setSavingReview(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/avaliacoes"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Nova avaliação</h1>
      </div>

      {step === "upload" && (
        <>
          <FileDrop onFileSelected={handleFileSelected} disabled={uploading} />
          {uploading && (
            <div className="glass flex items-center justify-center gap-2 rounded-[1.75rem] p-5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
              Lendo sua avaliação com IA...
            </div>
          )}
        </>
      )}

      {(step === "review" || step === "generating") && extracted && (
        <>
          <ReviewForm data={extracted} onChange={setExtracted} goal={goal} onGoalChange={setGoal} />
          <button
            type="button"
            onClick={handleConfirmReview}
            disabled={savingReview}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {savingReview ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
            ) : (
              <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            )}
            {step === "generating" ? "Gerando sua meta de dieta..." : "Confirmar e gerar dieta"}
          </button>
        </>
      )}

      {step === "plan" && plan && (
        <>
          <PlanResultCard plan={plan} />
          <div className="flex gap-3">
            <Link
              href="/avaliacoes"
              className="flex flex-1 items-center justify-center rounded-full bg-white/[0.06] py-3 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.09]"
            >
              Ver histórico
            </Link>
          </div>
        </>
      )}

      {error && (
        <div className="glass rounded-[1.75rem] p-4 text-sm text-[oklch(0.72_0.17_32)]">{error}</div>
      )}
    </div>
  );
}
