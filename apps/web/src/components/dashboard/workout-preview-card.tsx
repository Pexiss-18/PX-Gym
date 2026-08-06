import Link from "next/link";
import { ArrowRight, Clock, Dumbbell } from "lucide-react";
import { todayWorkout } from "@/lib/mock-data";

export function WorkoutPreviewCard() {
  const completedSets = todayWorkout.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0,
  );
  const totalSets = todayWorkout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const progress = Math.round((completedSets / totalSets) * 100);

  return (
    <div className="glass relative overflow-hidden rounded-[1.75rem] p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-14 -bottom-20 h-44 w-44 rounded-full bg-primary/[0.06] blur-[70px]"
      />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Dumbbell className="h-4 w-4" strokeWidth={2.25} />
          <span className="text-sm font-medium">Treino de hoje</span>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" strokeWidth={2.5} />
          {todayWorkout.estimatedMinutes} min
        </span>
      </div>

      <h2 className="relative mt-4 text-xl font-semibold tracking-tight">
        {todayWorkout.label} · {todayWorkout.name}
      </h2>
      <p className="relative mt-1 text-sm text-muted-foreground">
        {todayWorkout.exercises.length} exercícios · {todayWorkout.focus}
      </p>

      <div className="relative mt-5 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-500 ease-out"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {completedSets}/{totalSets} séries
        </span>
      </div>

      <Link
        href="/treino"
        className="relative mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
      >
        Continuar treino
        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
      </Link>
    </div>
  );
}
