"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { ArrowRight, Scale } from "lucide-react";
import Link from "next/link";
import { bodyMetrics } from "@/lib/mock-data";
import { formatDelta } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function BodyCompositionCard() {
  const weightDelta = formatDelta(bodyMetrics.weightDeltaKg, "down");
  const fatDelta = formatDelta(bodyMetrics.bodyFatDeltaPct, "down");
  const muscleDelta = formatDelta(bodyMetrics.muscleMassDeltaKg, "up");

  return (
    <div className="glass relative overflow-hidden rounded-[1.75rem] p-6 lg:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-28 h-52 w-52 rounded-full bg-primary/[0.07] blur-[70px]"
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Scale className="h-4 w-4" strokeWidth={2.25} />
            <span className="text-sm font-medium">Avaliação corporal</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Última em {bodyMetrics.lastAssessment} · próxima {bodyMetrics.nextAssessment}
          </p>
        </div>
        <Link
          href="/progresso"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver evolução
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
        </Link>
      </div>

      <div className="relative mt-6 grid grid-cols-3 gap-4">
        <Metric
          label="Peso"
          value={bodyMetrics.weightKg.toFixed(1)}
          unit="kg"
          delta={weightDelta}
        />
        <Metric
          label="Gordura corporal"
          value={bodyMetrics.bodyFatPct.toFixed(1)}
          unit="%"
          delta={fatDelta}
        />
        <Metric
          label="Massa magra"
          value={bodyMetrics.muscleMassKg.toFixed(1)}
          unit="kg"
          delta={muscleDelta}
        />
      </div>

      <div className="relative mt-6 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={bodyMetrics.history} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.87 0.23 126)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="oklch(0.87 0.23 126)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
            <Area
              type="monotone"
              dataKey="weightKg"
              stroke="oklch(0.87 0.23 126)"
              strokeWidth={2.5}
              fill="url(#weightGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-muted-foreground">
          {bodyMetrics.history.map((point) => (
            <span key={point.date}>{point.date}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: string;
  unit: string;
  delta: { text: string; isGood: boolean };
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1 font-mono">
        <span className="text-2xl font-semibold tracking-tight lg:text-[26px]">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </p>
      <span
        className={cn(
          "mt-1 inline-block text-xs font-medium",
          delta.isGood ? "text-primary" : "text-[oklch(0.72_0.17_32)]",
        )}
      >
        {delta.text} {unit}
      </span>
    </div>
  );
}
