import { WorkoutTracker } from "@/components/workout/workout-tracker";
import { todayWorkout } from "@/lib/mock-data";

export default function TreinoPage() {
  return <WorkoutTracker workout={todayWorkout} />;
}
