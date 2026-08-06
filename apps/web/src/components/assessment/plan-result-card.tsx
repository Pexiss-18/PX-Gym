import { Flame, Sparkles } from "lucide-react";
import type { NutritionPlanRow } from "@/lib/types";

const macroMeta = {
  protein: { label: "Proteína", color: "oklch(0.72 0.17 32)" },
  carbs: { label: "Carboidrato", color: "oklch(0.82 0.15 78)" },
  fat: { label: "Gordura", color: "oklch(0.72 0.14 300)" },
} as const;

export function PlanResultCard({ plan }: { plan: NutritionPlanRow }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="glass relative overflow-hidden rounded-[1.75rem] p-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-primary/[0.06] blur-[70px]"
        />
        <div className="relative flex items-center justify-center gap-2 text-muted-foreground">
          <Flame className="h-4 w-4" strokeWidth={2.25} />
          <span className="text-sm font-medium">Meta diária sugerida</span>
        </div>
        <p className="relative mt-2 font-mono text-4xl font-semibold tracking-tight">
          {plan.calories_target}
          <span className="ml-1 text-base font-normal text-muted-foreground">kcal</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(Object.keys(macroMeta) as Array<keyof typeof macroMeta>).map((key) => {
          const macro = plan.macros[key];
          const meta = macroMeta[key];
          return (
            <div key={key} className="glass rounded-[1.75rem] p-5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="text-sm font-medium">{meta.label}</span>
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold">
                {macro.grams}
                <span className="ml-1 text-sm font-normal text-muted-foreground">g</span>
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">{macro.rationale}</p>
            </div>
          );
        })}
      </div>

      {plan.micros.length > 0 && (
        <div className="glass rounded-[1.75rem] p-6">
          <p className="text-sm font-medium">Micronutrientes relevantes</p>
          <div className="mt-4 flex flex-col gap-3">
            {plan.micros.map((micro) => (
              <div key={micro.name} className="border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{micro.name}</span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {micro.targetAmount}
                    {micro.unit}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{micro.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-[1.75rem] p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4" strokeWidth={2.25} />
          <span className="text-sm font-medium">Orientação</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">{plan.diet_guidance}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          Sugestão gerada por IA a partir da sua avaliação — não substitui acompanhamento de um
          nutricionista.
        </p>
      </div>
    </div>
  );
}
