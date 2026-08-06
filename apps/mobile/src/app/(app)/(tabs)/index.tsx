import { Pressable, Text, View } from "react-native";
import { router, useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import { Flame, Menu } from "lucide-react-native";
import { colors } from "@px/tokens";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { Readout, Delta } from "@/components/readout";
import { PillButton } from "@/components/pill-button";
import { ProgressBar } from "@/components/progress-bar";
import { bodyMetrics, nutritionDay, todayWorkout, user } from "@/lib/mock-data";

export default function InicioScreen() {
  const navigation = useNavigation();
  const progress = todayWorkout.progress();
  const kcalFraction = nutritionDay.caloriesConsumed / nutritionDay.caloriesTarget;

  return (
    <Screen>
      {/* topo: saudação + streak + menu */}
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="font-sans text-sm text-fog">Bem-vindo de volta</Text>
          <Text className="font-sans-semibold text-3xl text-paper">
            Olá, {user.name}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center gap-1 rounded-full border border-hairline bg-glass-fill px-3 py-2">
            <Flame size={14} color={colors.voltLime} strokeWidth={2.5} />
            <Text className="font-mono text-xs text-volt">
              {user.streakDays}
            </Text>
            <Text className="font-sans text-xs text-fog">dias</Text>
          </View>
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-glass-fill"
          >
            <Menu size={18} color={colors.paperForeground} />
          </Pressable>
        </View>
      </View>

      <View className="gap-5">
        {/* avaliação corporal atual */}
        <GlassCard>
          <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
            Avaliação corporal
          </Text>
          <View className="mt-3 flex-row justify-between">
            <View>
              <Readout value={bodyMetrics.weightKg} unit="kg" size={28} />
              <View className="mt-1 flex-row items-center gap-1">
                <Delta value={bodyMetrics.weightDeltaKg} invert />
                <Text className="font-sans text-xs text-fog">peso</Text>
              </View>
            </View>
            <View>
              <Readout value={bodyMetrics.bodyFatPct} unit="%" size={28} />
              <View className="mt-1 flex-row items-center gap-1">
                <Delta value={bodyMetrics.bodyFatDeltaPct} invert />
                <Text className="font-sans text-xs text-fog">gordura</Text>
              </View>
            </View>
            <View>
              <Readout value={bodyMetrics.muscleMassKg} unit="kg" size={28} />
              <View className="mt-1 flex-row items-center gap-1">
                <Delta value={bodyMetrics.muscleMassDeltaKg} />
                <Text className="font-sans text-xs text-fog">músculo</Text>
              </View>
            </View>
          </View>
          <Text className="mt-4 font-sans text-xs text-fog">
            Última avaliação: {bodyMetrics.lastAssessment}
          </Text>
        </GlassCard>

        {/* treino de hoje */}
        <GlassCard>
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
              Treino de hoje
            </Text>
            <Text className="font-sans text-xs text-fog">
              {todayWorkout.label}
            </Text>
          </View>
          <Text className="mt-2 font-sans-semibold text-xl text-paper">
            {todayWorkout.name}
          </Text>
          <View className="mt-3 flex-row items-center gap-2">
            <View className="flex-1">
              <ProgressBar
                fraction={progress.fraction}
                color={colors.voltLime}
              />
            </View>
            <View className="flex-row items-baseline gap-0.5">
              <Text className="font-mono text-xs text-volt">
                {progress.completedSets}
              </Text>
              <Text className="font-sans text-xs text-fog">/</Text>
              <Text className="font-mono text-xs text-fog">
                {progress.totalSets}
              </Text>
            </View>
          </View>
          <View className="mt-4">
            <PillButton onPress={() => router.push("/treino")}>
              Continuar treino
            </PillButton>
          </View>
        </GlassCard>

        {/* resumo nutrição */}
        <GlassCard>
          <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
            Nutrição de hoje
          </Text>
          <View className="mt-3 flex-row items-baseline justify-between">
            <Readout
              value={nutritionDay.caloriesConsumed}
              unit={`/ ${nutritionDay.caloriesTarget} kcal`}
              size={22}
            />
          </View>
          <View className="mt-3">
            <ProgressBar fraction={kcalFraction} color={colors.voltLime} />
          </View>
          <View className="mt-4 flex-row justify-between">
            {nutritionDay.macros.map((m) => {
              const color =
                m.key === "protein"
                  ? colors.proteinCoral
                  : m.key === "carbs"
                    ? colors.carbsAmber
                    : colors.fatViolet;
              return (
                <View key={m.key} className="flex-row items-center gap-1.5">
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <Text className="font-mono text-xs text-paper">
                    {m.currentG}
                  </Text>
                  <Text className="font-sans text-xs text-fog">
                    /
                  </Text>
                  <Text className="font-mono text-xs text-fog">
                    {m.targetG}g
                  </Text>
                </View>
              );
            })}
          </View>
        </GlassCard>
      </View>
    </Screen>
  );
}
