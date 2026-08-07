import { Pressable, Text, View } from "react-native";
import { router, useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import { Flame, Menu } from "lucide-react-native";
import { colors } from "@px/tokens";
import type { BodyAssessment } from "@px/core";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { Readout, Delta } from "@/components/readout";
import { PillButton } from "@/components/pill-button";
import { ProgressBar } from "@/components/progress-bar";
import { todayWorkout } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { displayName } from "@/lib/identity";
import {
  useStreakDays,
  useTodayDoneByExercise,
} from "@/lib/use-workout-data";
import { useBodyMetrics, useLatestPlan } from "@/lib/remote";

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function assessmentDate(assessment: BodyAssessment): string {
  const iso = assessment.extracted?.assessmentDate;
  if (iso) {
    const parsed = new Date(`${iso}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return formatShortDate(parsed);
  }
  return formatShortDate(assessment.createdAt);
}

function metricDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (current == null || previous == null) return null;
  return Math.round((current - previous) * 10) / 10;
}

/** Métrica da avaliação: valor (ou —) com delta vs avaliação anterior. */
function Metric({
  value,
  unit,
  delta,
  label,
  invert = false,
}: {
  value: number | null | undefined;
  unit: string;
  delta: number | null;
  label: string;
  invert?: boolean;
}) {
  return (
    <View>
      <Readout value={value ?? "—"} unit={unit} size={28} />
      <View className="mt-1 flex-row items-center gap-1">
        {delta !== null ? <Delta value={delta} invert={invert} /> : null}
        <Text className="font-sans text-xs text-fog">{label}</Text>
      </View>
    </View>
  );
}

export default function InicioScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const name = displayName(session);

  const streakDays = useStreakDays();
  const doneByExercise = useTodayDoneByExercise();
  const metrics = useBodyMetrics();
  const plan = useLatestPlan();

  const totalSets = todayWorkout.exercises.reduce(
    (n, e) => n + e.sets.length,
    0,
  );
  const completedSets = todayWorkout.exercises.reduce(
    (n, e) => n + Math.min(doneByExercise.get(e.id) ?? 0, e.sets.length),
    0,
  );
  const fraction = totalSets === 0 ? 0 : completedSets / totalSets;

  return (
    <Screen>
      {/* topo: saudação + streak + menu */}
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="font-sans text-sm text-fog">Bem-vindo de volta</Text>
          <Text className="font-sans-semibold text-3xl text-paper">
            Olá, {name}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center gap-1 rounded-full border border-hairline bg-glass-fill px-3 py-2">
            <Flame
              size={14}
              color={streakDays > 0 ? colors.voltLime : colors.fogMuted}
              strokeWidth={2.5}
            />
            <Text
              className={`font-mono text-xs ${streakDays > 0 ? "text-volt" : "text-fog"}`}
            >
              {streakDays}
            </Text>
            <Text className="font-sans text-xs text-fog">
              {streakDays === 1 ? "dia" : "dias"}
            </Text>
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
          {metrics.status === "ready" && metrics.data.latest?.extracted ? (
            <>
              <View className="mt-3 flex-row justify-between">
                <Metric
                  value={metrics.data.latest.extracted.weightKg}
                  unit="kg"
                  delta={metricDelta(
                    metrics.data.latest.extracted.weightKg,
                    metrics.data.previous?.extracted?.weightKg,
                  )}
                  label="peso"
                  invert
                />
                <Metric
                  value={metrics.data.latest.extracted.bodyFatPct}
                  unit="%"
                  delta={metricDelta(
                    metrics.data.latest.extracted.bodyFatPct,
                    metrics.data.previous?.extracted?.bodyFatPct,
                  )}
                  label="gordura"
                  invert
                />
                <Metric
                  value={metrics.data.latest.extracted.muscleMassKg}
                  unit="kg"
                  delta={metricDelta(
                    metrics.data.latest.extracted.muscleMassKg,
                    metrics.data.previous?.extracted?.muscleMassKg,
                  )}
                  label="músculo"
                />
              </View>
              <Text className="mt-4 font-sans text-xs text-fog">
                Última avaliação: {assessmentDate(metrics.data.latest)}
              </Text>
            </>
          ) : (
            <Text className="mt-3 font-sans text-sm text-fog">
              {metrics.status === "loading"
                ? "Carregando…"
                : metrics.status === "error"
                  ? "Sem conexão com o servidor."
                  : "Envie o PDF da sua avaliação no Px GYM web pra acompanhar peso, gordura e músculo por aqui."}
            </Text>
          )}
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
              <ProgressBar fraction={fraction} color={colors.voltLime} />
            </View>
            <View className="flex-row items-baseline gap-0.5">
              <Text className="font-mono text-xs text-volt">
                {completedSets}
              </Text>
              <Text className="font-sans text-xs text-fog">/</Text>
              <Text className="font-mono text-xs text-fog">{totalSets}</Text>
            </View>
          </View>
          <View className="mt-4">
            <PillButton onPress={() => router.push("/treino")}>
              {completedSets === 0 ? "Começar treino" : "Continuar treino"}
            </PillButton>
          </View>
        </GlassCard>

        {/* plano nutricional */}
        <GlassCard>
          <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
            Plano nutricional
          </Text>
          {plan.status === "ready" && plan.data ? (
            <>
              <View className="mt-3">
                <Readout
                  value={plan.data.caloriesTarget}
                  unit="kcal / dia"
                  size={22}
                />
              </View>
              <View className="mt-4 flex-row justify-between">
                {(
                  [
                    ["protein", "P", colors.proteinCoral],
                    ["carbs", "C", colors.carbsAmber],
                    ["fat", "G", colors.fatViolet],
                  ] as const
                ).map(([key, label, color]) => (
                  <View key={key} className="flex-row items-center gap-1.5">
                    <View
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <Text className="font-sans text-xs text-fog">{label}</Text>
                    <Text className="font-mono text-xs text-paper">
                      {plan.data!.macros[key].grams}
                    </Text>
                    <Text className="font-sans text-xs text-fog">g</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text className="mt-3 font-sans text-sm text-fog">
              {plan.status === "loading"
                ? "Carregando…"
                : plan.status === "error"
                  ? "Sem conexão com o servidor."
                  : "Seu plano aparece aqui depois que a primeira avaliação for processada no Px GYM web."}
            </Text>
          )}
        </GlassCard>
      </View>
    </Screen>
  );
}
