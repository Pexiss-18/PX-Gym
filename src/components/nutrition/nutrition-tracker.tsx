"use client";

import { useMemo, useState } from "react";
import { CaloriesHeader } from "@/components/nutrition/calories-header";
import { MacroCard } from "@/components/nutrition/macro-card";
import { MealCard } from "@/components/nutrition/meal-card";
import type { MacroKey, NutritionDay } from "@/lib/types";

export function NutritionTracker({ data }: { data: NutritionDay }) {
  const [meals, setMeals] = useState(data.meals);

  const consumed = useMemo(
    () => meals.filter((m) => m.logged).reduce((sum, m) => sum + m.calories, 0),
    [meals],
  );

  const macroTotals = useMemo(() => {
    const totals: Record<MacroKey, number> = { protein: 0, carbs: 0, fat: 0 };
    for (const meal of meals) {
      if (!meal.logged) continue;
      totals.protein += meal.macros.protein;
      totals.carbs += meal.macros.carbs;
      totals.fat += meal.macros.fat;
    }
    return totals;
  }, [meals]);

  function toggleMeal(id: string) {
    setMeals((prev) => prev.map((m) => (m.id === id ? { ...m, logged: !m.logged } : m)));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <CaloriesHeader
        consumed={consumed}
        target={data.caloriesTarget}
        waterMl={data.waterMl.current}
        waterTargetMl={data.waterMl.target}
      />

      <div className="grid grid-cols-3 gap-3">
        {data.macros.map((macro) => (
          <MacroCard
            key={macro.key}
            macro={{ ...macro, currentG: macroTotals[macro.key] }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} onToggle={() => toggleMeal(meal.id)} />
        ))}
      </div>
    </div>
  );
}
