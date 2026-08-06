"use client";

import { useState } from "react";
import { ChevronDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetRow } from "@/components/workout/set-row";
import type { LiveSet } from "@/lib/types";

type ExerciseCardProps = {
  exercise: { id: string; name: string; muscleGroup: string; sets: LiveSet[] };
  defaultOpen?: boolean;
  onToggleSet: (setNumber: number) => void;
  onChangeLoad: (setNumber: number, delta: number) => void;
};

export function ExerciseCard({
  exercise,
  defaultOpen = false,
  onToggleSet,
  onChangeLoad,
}: ExerciseCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const isDone = completedCount === exercise.sets.length;
  const bestDelta = Math.max(...exercise.sets.map((s) => s.currentLoadKg - s.previousLoadKg));

  return (
    <div className="glass overflow-hidden rounded-[1.75rem]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-mono text-sm font-semibold transition-colors",
            isDone ? "bg-primary text-primary-foreground" : "bg-white/[0.06] text-foreground/70",
          )}
        >
          {completedCount}/{exercise.sets.length}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{exercise.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {exercise.muscleGroup}
            {bestDelta > 0 && (
              <span className="flex items-center gap-0.5 text-primary">
                <TrendingUp className="h-3 w-3" strokeWidth={2.5} />+{bestDelta.toFixed(1)}kg
              </span>
            )}
          </p>
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={2.25}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-2 px-5 pb-5">
            {exercise.sets.map((set) => (
              <SetRow
                key={set.setNumber}
                set={set}
                currentLoadKg={set.currentLoadKg}
                onToggle={() => onToggleSet(set.setNumber)}
                onLoadChange={(delta) => onChangeLoad(set.setNumber, delta)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
