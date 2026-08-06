import Link from "next/link";
import { AlertCircle, Clock, Flame, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { AssessmentStatus, NutritionPlanRow } from "@/lib/types";

type AssessmentListItem = {
  id: string;
  status: AssessmentStatus;
  created_at: string;
  error_message: string | null;
  nutrition_plans: NutritionPlanRow[];
};

const statusLabel: Record<AssessmentStatus, string> = {
  processing: "Lendo avaliação...",
  pending_review: "Aguardando revisão",
  reviewed: "Gerando dieta...",
  error: "Falha ao processar",
};

export default async function AvaliacoesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_assessments")
    .select("id, status, created_at, error_message, nutrition_plans(id, calories_target, macros, micros, diet_guidance, model, assessment_id, user_id, created_at)")
    .order("created_at", { ascending: false });

  const assessments = (data ?? []) as unknown as AssessmentListItem[];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Avaliações</h1>
        <Link
          href="/avaliacoes/nova"
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Nova avaliação
        </Link>
      </div>

      {error && (
        <div className="glass rounded-[1.75rem] p-5 text-sm text-[oklch(0.72_0.17_32)]">
          Não foi possível carregar suas avaliações: {error.message}
        </div>
      )}

      {!error && assessments.length === 0 && (
        <div className="glass flex flex-col items-center gap-3 rounded-[1.75rem] p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Você ainda não enviou nenhuma avaliação corporal.
          </p>
          <Link
            href="/avaliacoes/nova"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Enviar a primeira
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {assessments.map((assessment) => {
          const plan = assessment.nutrition_plans?.[0];
          const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
            new Date(assessment.created_at),
          );

          return (
            <div key={assessment.id} className="glass rounded-[1.75rem] p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" strokeWidth={2.25} />
                  {date}
                </span>
                {!plan && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium",
                      assessment.status === "error"
                        ? "bg-[oklch(0.72_0.17_32_/_0.15)] text-[oklch(0.72_0.17_32)]"
                        : "bg-white/[0.06] text-muted-foreground",
                    )}
                  >
                    {statusLabel[assessment.status]}
                  </span>
                )}
              </div>

              {assessment.status === "error" && assessment.error_message && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-[oklch(0.72_0.17_32)]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                  {assessment.error_message}
                </p>
              )}

              {plan && (
                <div className="mt-3 flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-mono text-lg font-semibold">
                    <Flame className="h-4 w-4 text-primary" strokeWidth={2.25} />
                    {plan.calories_target}
                    <span className="text-xs font-normal text-muted-foreground">kcal</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    P {plan.macros.protein.grams}g · C {plan.macros.carbs.grams}g · G{" "}
                    {plan.macros.fat.grams}g
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
