import { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import { CloudOff, LineChart as LineChartIcon, Menu } from "lucide-react-native";
import { colors } from "@px/tokens";
import {
  buildBodyHistory,
  historyDelta,
  measurementsFrom,
  type BodyHistoryPoint,
} from "@px/core";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { Readout } from "@/components/readout";
import { MeasurementsCard } from "@/components/measurements-card";
import { ChartLegend, LineChart } from "@/components/charts/line-chart";
import { useAssessments } from "@/lib/remote";

/** AAAA-MM-DD → "12 ago" pro eixo do gráfico. */
function shortLabel(isoDate: string): string {
  const [y = 0, m = 1, d = 1] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function lastValue(
  history: BodyHistoryPoint[],
  metric: "weightKg" | "bodyFatPct" | "muscleMassKg",
): number | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const value = history[i]![metric];
    if (value !== null) return value;
  }
  return null;
}

/** Variação total: volt quando foi na direção desejada, fog quando não. */
function TrendStat({
  label,
  delta,
  unit,
  goodWhenNegative,
}: {
  label: string;
  delta: number | null;
  unit: string;
  goodWhenNegative: boolean;
}) {
  const isGood =
    delta === null ? false : goodWhenNegative ? delta < 0 : delta > 0;
  return (
    <View className="items-end">
      <Text className="font-sans text-[11px] text-fog">{label}</Text>
      <View className="mt-0.5 flex-row items-baseline gap-1">
        <Text
          className="font-mono text-sm"
          style={{ color: isGood ? colors.voltLime : colors.fogMuted }}
        >
          {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
        </Text>
        <Text className="font-sans text-[11px] text-fog">{unit}</Text>
      </View>
    </View>
  );
}

/**
 * Evolução corporal ao longo do tempo — a visão que o web tem em /progresso,
 * agora no mobile e com dado real das avaliações (no web ainda é mock).
 */
export default function ProgressoScreen() {
  const navigation = useNavigation();
  const assessments = useAssessments();

  const history = useMemo(
    () => buildBodyHistory(assessments.data ?? []),
    [assessments.data],
  );

  // listByUser vem em ordem decrescente: [0] é a mais recente, [1] a anterior.
  const measurements = useMemo(() => {
    const usable = (assessments.data ?? []).filter((a) => a.extracted);
    return measurementsFrom(usable[0], usable[1]);
  }, [assessments.data]);

  const labels = history.map((p) => shortLabel(p.date));
  const weight = lastValue(history, "weightKg");
  const fat = lastValue(history, "bodyFatPct");
  const muscle = lastValue(history, "muscleMassKg");

  return (
    <Screen bottomInset={24}>
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="font-sans text-sm text-fog">Evolução</Text>
          <Text className="font-sans-semibold text-3xl text-paper">
            Progresso
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-glass-fill"
        >
          <Menu size={18} color={colors.paperForeground} />
        </Pressable>
      </View>

      {assessments.status === "loading" ? (
        <View className="items-center py-16">
          <ActivityIndicator color={colors.voltLime} />
        </View>
      ) : assessments.status === "error" ? (
        <GlassCard className="items-center py-10">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
            <CloudOff size={24} color={colors.fogMuted} />
          </View>
          <Text className="mt-4 font-sans-semibold text-base text-paper">
            Sem conexão com o servidor
          </Text>
          <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">
            A evolução recarrega sozinha quando você voltar pra esta tela.
          </Text>
        </GlassCard>
      ) : history.length === 0 ? (
        <GlassCard className="items-center py-10">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
            <LineChartIcon size={24} color={colors.fogMuted} />
          </View>
          <Text className="mt-4 font-sans-semibold text-base text-paper">
            Sua curva começa na primeira avaliação
          </Text>
          <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">
            Envie o PDF da avaliação corporal no Px GYM web. Com duas ou mais,
            a tendência aparece aqui.
          </Text>
        </GlassCard>
      ) : (
        <View className="gap-5">
          {/* curva peso × gordura */}
          <GlassCard>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
                  Peso e gordura corporal
                </Text>
                <Text className="mt-1 font-sans text-xs text-fog">
                  Desde {shortLabel(history[0]!.date)}
                </Text>
              </View>
              <View className="flex-row gap-4">
                <TrendStat
                  label="Peso"
                  delta={historyDelta(history, "weightKg")}
                  unit="kg"
                  goodWhenNegative
                />
                <TrendStat
                  label="Gordura"
                  delta={historyDelta(history, "bodyFatPct")}
                  unit="%"
                  goodWhenNegative
                />
              </View>
            </View>

            <View className="mt-5">
              <LineChart
                labels={labels}
                series={[
                  {
                    key: "weight",
                    values: history.map((p) => p.weightKg),
                    color: colors.voltLime,
                    area: true,
                  },
                  {
                    key: "fat",
                    values: history.map((p) => p.bodyFatPct),
                    color: colors.proteinCoral,
                  },
                ]}
                height={200}
              />
            </View>

            <View className="mt-4">
              <ChartLegend
                items={[
                  {
                    label: "Peso",
                    value: weight === null ? "—" : weight.toFixed(1),
                    unit: "kg",
                    color: colors.voltLime,
                  },
                  {
                    label: "Gordura",
                    value: fat === null ? "—" : fat.toFixed(1),
                    unit: "%",
                    color: colors.proteinCoral,
                  },
                ]}
              />
            </View>
          </GlassCard>

          {/* composição atual */}
          <GlassCard>
            <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
              Composição atual
            </Text>
            <View className="mt-4 gap-4">
              <CompositionRow
                label="Peso"
                value={weight}
                unit="kg"
                delta={historyDelta(history, "weightKg")}
              />
              <CompositionRow
                label="Gordura corporal"
                value={fat}
                unit="%"
                delta={historyDelta(history, "bodyFatPct")}
              />
              <CompositionRow
                label="Massa magra"
                value={muscle}
                unit="kg"
                delta={historyDelta(history, "muscleMassKg")}
              />
            </View>
          </GlassCard>

          <MeasurementsCard measurements={measurements} />

          <Text className="px-1 font-sans text-xs text-fog">
            {history.length === 1
              ? "Com uma segunda avaliação a tendência aparece no gráfico."
              : `${history.length} avaliações no histórico.`}
          </Text>
        </View>
      )}
    </Screen>
  );
}

function CompositionRow({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: number | null;
  unit: string;
  delta: number | null;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-sans text-sm text-fog">{label}</Text>
      <View className="flex-row items-baseline gap-2">
        <Readout value={value === null ? "—" : value.toFixed(1)} unit={unit} size={18} />
        {delta !== null && delta !== 0 ? (
          <Text className="font-mono text-[11px] text-fog">
            {delta > 0 ? "+" : ""}
            {delta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
