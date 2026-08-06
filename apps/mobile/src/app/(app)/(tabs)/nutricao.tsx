import { Text, View } from "react-native";
import { CircleCheck } from "lucide-react-native";
import { colors } from "@px/tokens";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { Readout } from "@/components/readout";
import { ProgressBar } from "@/components/progress-bar";
import { nutritionDay } from "@/lib/mock-data";

const MACRO_COLORS = {
  protein: colors.proteinCoral,
  carbs: colors.carbsAmber,
  fat: colors.fatViolet,
} as const;

export default function NutricaoScreen() {
  const remaining =
    nutritionDay.caloriesTarget - nutritionDay.caloriesConsumed;

  return (
    <Screen>
      <View className="mb-6">
        <Text className="font-sans text-sm text-fog">Nutrição</Text>
        <Text className="font-sans-semibold text-3xl text-paper">Hoje</Text>
      </View>

      <View className="gap-5">
        <GlassCard>
          <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
            Calorias
          </Text>
          <View className="mt-2 flex-row items-baseline justify-between">
            <Readout
              value={nutritionDay.caloriesConsumed}
              unit={`/ ${nutritionDay.caloriesTarget} kcal`}
              size={28}
            />
            <View className="flex-row items-baseline gap-1">
              <Text className="font-mono text-sm text-volt">{remaining}</Text>
              <Text className="font-sans text-xs text-fog">restantes</Text>
            </View>
          </View>
          <View className="mt-3">
            <ProgressBar
              fraction={
                nutritionDay.caloriesConsumed / nutritionDay.caloriesTarget
              }
              color={colors.voltLime}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
            Macros
          </Text>
          <View className="mt-4 gap-4">
            {nutritionDay.macros.map((m) => (
              <View key={m.key}>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: MACRO_COLORS[m.key] }}
                    />
                    <Text className="font-sans text-sm text-paper">
                      {m.label}
                    </Text>
                  </View>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="font-mono text-sm text-paper">
                      {m.currentG}
                    </Text>
                    <Text className="font-sans text-xs text-fog">/</Text>
                    <Text className="font-mono text-xs text-fog">
                      {m.targetG}g
                    </Text>
                  </View>
                </View>
                <ProgressBar
                  fraction={m.currentG / m.targetG}
                  color={MACRO_COLORS[m.key]}
                  height={6}
                />
              </View>
            ))}
          </View>
        </GlassCard>

        <GlassCard>
          <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
            Refeições
          </Text>
          <View className="mt-3 gap-3">
            {nutritionDay.meals.map((meal) => (
              <View
                key={meal.id}
                className="flex-row items-center justify-between rounded-px-md border border-hairline bg-glass-fill p-3.5"
              >
                <View className="flex-row items-center gap-3">
                  <CircleCheck
                    size={18}
                    color={meal.logged ? colors.voltLime : colors.fogMuted}
                    strokeWidth={2.25}
                  />
                  <View>
                    <Text className="font-sans-medium text-sm text-paper">
                      {meal.name}
                    </Text>
                    <Text className="font-sans text-[11px] text-fog">
                      {meal.time}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-baseline gap-1">
                  <Text className="font-mono text-sm text-paper">
                    {meal.calories}
                  </Text>
                  <Text className="font-sans text-[11px] text-fog">kcal</Text>
                </View>
              </View>
            ))}
          </View>
        </GlassCard>
      </View>
    </Screen>
  );
}
