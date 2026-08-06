import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { weekSchedule } from "@/lib/mock-data";

export function WeekStrip() {
  return (
    <div className="glass flex items-center justify-between rounded-[1.75rem] p-3 lg:p-4">
      {weekSchedule.map((day) => (
        <div
          key={day.day}
          className={cn(
            "flex flex-1 flex-col items-center gap-2 rounded-2xl py-3 transition-colors",
            day.active && "bg-primary/[0.12]",
          )}
        >
          <span
            className={cn(
              "text-[11px] font-medium uppercase tracking-wide",
              day.active ? "text-primary" : "text-muted-foreground",
            )}
          >
            {day.day}
          </span>
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
              day.done
                ? "bg-primary text-primary-foreground"
                : day.active
                  ? "border-2 border-primary text-primary"
                  : "bg-white/[0.05] text-muted-foreground",
            )}
          >
            {day.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
