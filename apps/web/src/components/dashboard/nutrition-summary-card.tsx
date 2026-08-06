import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { MacroRing } from "@/components/nutrition/macro-ring";
import { nutritionDay } from "@/lib/mock-data";

const macroColors: Record<string, string> = {
  protein: "oklch(0.72 0.17 32)",
  carbs: "oklch(0.82 0.15 78)",
  fat: "oklch(0.72 0.14 300)",
};

export function NutritionSummaryCard() {
  const remaining = nutritionDay.caloriesTarget - nutritionDay.caloriesConsumed;
  const progress = nutritionDay.caloriesConsumed / nutritionDay.caloriesTarget;

  return (
    <div className="glass rounded-[1.75rem] p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Flame className="h-4 w-4" strokeWidth={2.25} />
          <span className="text-sm font-medium">Nutrição de hoje</span>
        </div>
        <Link
          href="/nutricao"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver refeições
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
        </Link>
      </div>

      <div className="mt-5 flex items-center gap-6">
        <MacroRing progress={progress} color="oklch(0.87 0.23 126)" size={104} strokeWidth={9}>
          <div className="text-center">
            <p className="font-mono text-lg font-semibold leading-none">{remaining}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">kcal restantes</p>
          </div>
        </MacroRing>

        <div className="flex-1 space-y-3">
          {nutritionDay.macros.map((macro) => {
            const pct = Math.round((macro.currentG / macro.targetG) * 100);
            return (
              <div key={macro.key}>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: macroColors[macro.key] }}
                    />
                    {macro.label}
                  </span>
                  <span className="font-mono text-foreground/80">
                    {macro.currentG}
                    <span className="text-muted-foreground">/{macro.targetG}g</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full w-full origin-left rounded-full transition-transform duration-500 ease-out"
                    style={{
                      transform: `scaleX(${Math.min(pct, 100) / 100})`,
                      backgroundColor: macroColors[macro.key],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
