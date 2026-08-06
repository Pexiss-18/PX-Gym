import { TrendingDown, TrendingUp } from "lucide-react";
import { WeightChart } from "@/components/progress/weight-chart";
import { MeasurementsCard } from "@/components/dashboard/measurements-card";
import { bodyMetrics } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function ProgressoPage() {
  const first = bodyMetrics.history[0];
  const last = bodyMetrics.history[bodyMetrics.history.length - 1];
  const weightChange = last.weightKg - first.weightKg;
  const fatChange = last.bodyFatPct - first.bodyFatPct;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="glass rounded-[1.75rem] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Evolução desde {first.date}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Peso e gordura corporal</h2>
          </div>
          <div className="flex gap-4 text-right">
            <TrendStat label="Peso" value={weightChange} unit="kg" />
            <TrendStat label="Gordura" value={fatChange} unit="%" />
          </div>
        </div>
        <div className="mt-4">
          <WeightChart history={bodyMetrics.history} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MeasurementsCard />
        <div className="glass rounded-[1.75rem] p-6">
          <p className="text-sm font-medium text-muted-foreground">Composição atual</p>
          <div className="mt-4 space-y-4">
            <CompositionRow label="Peso" value={`${bodyMetrics.weightKg.toFixed(1)} kg`} />
            <CompositionRow label="Gordura corporal" value={`${bodyMetrics.bodyFatPct.toFixed(1)}%`} />
            <CompositionRow label="Massa magra" value={`${bodyMetrics.muscleMassKg.toFixed(1)} kg`} />
            <CompositionRow label="Próxima avaliação" value={bodyMetrics.nextAssessment} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendStat({ label, value, unit }: { label: string; value: number; unit: string }) {
  const isGood = value < 0;
  const Icon = isGood ? TrendingDown : TrendingUp;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "flex items-center gap-1 font-mono text-sm font-semibold",
          isGood ? "text-primary" : "text-[oklch(0.72_0.17_32)]",
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
        {value > 0 ? "+" : ""}
        {value.toFixed(1)}
        {unit}
      </p>
    </div>
  );
}

function CompositionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-semibold">{value}</span>
    </div>
  );
}
