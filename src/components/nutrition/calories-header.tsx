import { Droplet } from "lucide-react";
import { MacroRing } from "@/components/nutrition/macro-ring";

type CaloriesHeaderProps = {
  consumed: number;
  target: number;
  waterMl: number;
  waterTargetMl: number;
};

export function CaloriesHeader({ consumed, target, waterMl, waterTargetMl }: CaloriesHeaderProps) {
  const remaining = Math.max(target - consumed, 0);
  const progress = consumed / target;
  const waterProgress = waterMl / waterTargetMl;

  return (
    <div className="glass relative overflow-hidden rounded-[1.75rem] p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-28 h-52 w-52 rounded-full bg-primary/[0.06] blur-[70px]"
      />
      <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <MacroRing progress={progress} size={128} strokeWidth={10} color="oklch(0.87 0.23 126)">
            <div className="text-center">
              <p className="font-mono text-2xl font-semibold leading-none">{remaining}</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">kcal restantes</p>
            </div>
          </MacroRing>
          <div>
            <p className="text-sm text-muted-foreground">Consumido hoje</p>
            <p className="mt-1 font-mono text-2xl font-semibold">
              {consumed}
              <span className="text-sm font-normal text-muted-foreground">/{target} kcal</span>
            </p>
          </div>
        </div>

        <div className="w-full max-w-[220px] rounded-2xl bg-white/[0.04] p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Droplet className="h-3.5 w-3.5 text-[oklch(0.75_0.12_235)]" strokeWidth={2.25} />
              Água
            </span>
            <span className="font-mono">
              {(waterMl / 1000).toFixed(1)}/{(waterTargetMl / 1000).toFixed(1)}L
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full w-full origin-left rounded-full bg-[oklch(0.75_0.12_235)] transition-transform duration-500 ease-out"
              style={{ transform: `scaleX(${Math.min(waterProgress, 1)})` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
