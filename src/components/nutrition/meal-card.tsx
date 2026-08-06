import { Check, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Meal } from "@/lib/types";

const macroColors: Record<string, string> = {
  protein: "oklch(0.72 0.17 32)",
  carbs: "oklch(0.82 0.15 78)",
  fat: "oklch(0.72 0.14 300)",
};

const macroLabels: Record<string, string> = {
  protein: "P",
  carbs: "C",
  fat: "G",
};

export function MealCard({ meal, onToggle }: { meal: Meal; onToggle: () => void }) {
  return (
    <div
      className={cn(
        "glass rounded-[1.75rem] p-5 transition-colors",
        meal.logged && "border-primary/20 bg-primary/[0.04]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold">{meal.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{meal.time}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={meal.logged}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            meal.logged
              ? "bg-primary text-primary-foreground"
              : "bg-white/[0.06] text-muted-foreground hover:text-foreground",
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.75} />
          {meal.logged ? "Registrado" : "Registrar"}
        </button>
      </div>

      <ul className="mt-4 space-y-1.5">
        {meal.items.map((item) => (
          <li key={item.name} className="flex items-center justify-between text-sm">
            <span className="text-foreground/85">{item.name}</span>
            <span className="text-xs text-muted-foreground">{item.qty}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Flame className="h-3.5 w-3.5" strokeWidth={2.25} />
          {meal.calories} kcal
        </span>
        <div className="flex items-center gap-2.5 font-mono text-[11px]">
          {(Object.keys(meal.macros) as Array<keyof typeof meal.macros>).map((key) => (
            <span key={key} className="flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: macroColors[key] }}
              />
              {meal.macros[key]}
              {macroLabels[key]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
