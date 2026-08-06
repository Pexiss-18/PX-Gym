import { MacroRing } from "@/components/nutrition/macro-ring";
import type { MacroGoal } from "@/lib/types";

const macroColors: Record<string, string> = {
  protein: "oklch(0.72 0.17 32)",
  carbs: "oklch(0.82 0.15 78)",
  fat: "oklch(0.72 0.14 300)",
};

export function MacroCard({ macro }: { macro: MacroGoal }) {
  const progress = macro.currentG / macro.targetG;
  const color = macroColors[macro.key];

  return (
    <div className="glass flex flex-col items-center gap-3 rounded-[1.75rem] p-5 text-center">
      <MacroRing progress={progress} size={76} strokeWidth={7} color={color}>
        <span className="font-mono text-xs font-semibold">{Math.round(progress * 100)}%</span>
      </MacroRing>
      <div>
        <p className="text-sm font-medium">{macro.label}</p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          {macro.currentG}
          <span>/{macro.targetG}g</span>
        </p>
      </div>
    </div>
  );
}
