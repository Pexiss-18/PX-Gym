import { NutritionTracker } from "@/components/nutrition/nutrition-tracker";
import { nutritionDay } from "@/lib/mock-data";

export default function NutricaoPage() {
  return <NutritionTracker data={nutritionDay} />;
}
