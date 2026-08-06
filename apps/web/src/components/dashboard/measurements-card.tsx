import { Ruler } from "lucide-react";
import { bodyMetrics } from "@/lib/mock-data";
import { cn, formatDelta } from "@/lib/utils";

export function MeasurementsCard() {
  return (
    <div className="glass rounded-[1.75rem] p-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Ruler className="h-4 w-4" strokeWidth={2.25} />
        <span className="text-sm font-medium">Medidas</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
        {bodyMetrics.measurements.map((m) => {
          const delta = formatDelta(m.deltaCm, "down");
          return (
            <div key={m.label} className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-sm font-semibold">{m.valueCm.toFixed(1)}</span>
                <span
                  className={cn(
                    "text-[11px]",
                    delta.isGood ? "text-primary" : "text-[oklch(0.72_0.17_32)]",
                  )}
                >
                  {delta.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
