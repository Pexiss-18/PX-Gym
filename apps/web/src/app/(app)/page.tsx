import { BodyCompositionCard } from "@/components/dashboard/body-composition-card";
import { MeasurementsCard } from "@/components/dashboard/measurements-card";
import { NutritionSummaryCard } from "@/components/dashboard/nutrition-summary-card";
import { WorkoutPreviewCard } from "@/components/dashboard/workout-preview-card";
import { WeekStrip } from "@/components/dashboard/week-strip";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";

export default function DashboardPage() {
  return (
    <RevealGroup className="mx-auto max-w-6xl space-y-5">
      <RevealItem>
        <WeekStrip />
      </RevealItem>

      <RevealItem className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BodyCompositionCard />
        </div>
        <MeasurementsCard />
      </RevealItem>

      <RevealItem className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <WorkoutPreviewCard />
        <NutritionSummaryCard />
      </RevealItem>
    </RevealGroup>
  );
}
