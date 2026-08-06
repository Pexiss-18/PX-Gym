import { Clock, Flame } from "lucide-react";
import { MacroRing } from "@/components/nutrition/macro-ring";

type WorkoutHeaderProps = {
  label: string;
  name: string;
  focus: string;
  estimatedMinutes: number;
  completedSets: number;
  totalSets: number;
};

export function WorkoutHeader({
  label,
  name,
  focus,
  estimatedMinutes,
  completedSets,
  totalSets,
}: WorkoutHeaderProps) {
  const progress = totalSets === 0 ? 0 : completedSets / totalSets;

  return (
    <div className="glass relative overflow-hidden rounded-[1.75rem] p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-primary/[0.06] blur-[70px]"
      />
      <div className="relative flex items-center gap-5">
        <MacroRing progress={progress} size={92} strokeWidth={8} color="oklch(0.87 0.23 126)">
          <span className="font-mono text-sm font-semibold">{Math.round(progress * 100)}%</span>
        </MacroRing>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">{label}</p>
          <h2 className="mt-0.5 truncate text-xl font-semibold tracking-tight">{name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" strokeWidth={2.25} />
              {estimatedMinutes} min
            </span>
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" strokeWidth={2.25} />
              {focus}
            </span>
            <span className="font-mono">
              {completedSets}/{totalSets} séries
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
