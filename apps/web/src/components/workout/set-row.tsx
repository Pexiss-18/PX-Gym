"use client";

import { Check, Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LiveSet } from "@/lib/types";

type SetRowProps = {
  set: LiveSet;
  currentLoadKg: number;
  onToggle: () => void;
  onLoadChange: (delta: number) => void;
};

export function SetRow({ set, currentLoadKg, onToggle, onLoadChange }: SetRowProps) {
  const delta = currentLoadKg - set.previousLoadKg;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors",
        set.completed
          ? "border-primary/30 bg-primary/[0.08]"
          : "border-white/[0.06] bg-white/[0.02]",
      )}
    >
      <motion.button
        type="button"
        onClick={onToggle}
        whileTap={{ scale: 0.85 }}
        animate={{ scale: set.completed ? [1, 1.15, 1] : 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        aria-pressed={set.completed}
        aria-label={`Marcar série ${set.setNumber} como concluída`}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          set.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-white/15 text-transparent",
        )}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </motion.button>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Série {set.setNumber}</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {set.targetReps} reps
          <span className="mx-1">·</span>
          anterior {set.previousLoadKg}kg
          {delta !== 0 && (
            <span className={delta > 0 ? "text-primary" : "text-[oklch(0.72_0.17_32)]"}>
              {" "}
              ({delta > 0 ? "+" : ""}
              {delta.toFixed(1)})
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1.5 rounded-full bg-white/[0.04] p-1">
        <button
          type="button"
          onClick={() => onLoadChange(-2.5)}
          aria-label="Diminuir carga"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
        <span className="w-14 text-center font-mono text-sm font-semibold tabular-nums">
          {currentLoadKg}
          <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">kg</span>
        </span>
        <button
          type="button"
          onClick={() => onLoadChange(2.5)}
          aria-label="Aumentar carga"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
