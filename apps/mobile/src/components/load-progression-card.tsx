import { Text, View } from "react-native";
import { Trophy, TrendingUp } from "lucide-react-native";
import { colors } from "@px/tokens";
import type { LoadProgressionSummary } from "@px/core";
import { GlassCard } from "./glass-card";
import { LineChart } from "./charts/line-chart";

/**
 * Progressão de carga do exercício — o princípio nº 1 do PRODUCT.md tornado
 * visível: "o usuário deve ver 'subi de peso' de forma óbvia".
 *
 * Fica acima das séries porque é lido uma vez, no começo do exercício, que é
 * exatamente quando se decide a carga do dia. Compacto de propósito: durante o
 * treino o alvo de toque das séries não pode ser empurrado pra fora do polegar.
 */
export function LoadProgressionCard({
  summary,
}: {
  summary: LoadProgressionSummary;
}) {
  const { points, deltaKg, bestLoadKg, isPersonalRecord } = summary;

  if (points.length === 0) {
    return (
      <GlassCard className="p-4">
        <View className="flex-row items-center gap-2">
          <TrendingUp size={14} color={colors.fogMuted} strokeWidth={2.25} />
          <Text className="font-sans text-sm text-fog">
            Primeira vez neste exercício — a curva começa hoje.
          </Text>
        </View>
      </GlassCard>
    );
  }

  const sessions = points.length;
  const rising = deltaKg > 0;

  return (
    <GlassCard className="p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
              Progressão de carga
            </Text>
            {isPersonalRecord ? (
              <View
                className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
                style={{ backgroundColor: PR_TINT }}
              >
                <Trophy size={10} color={colors.voltLime} strokeWidth={2.5} />
                <Text className="font-sans-medium text-[10px] text-volt">
                  RECORDE
                </Text>
              </View>
            ) : null}
          </View>

          <View className="mt-2 flex-row items-baseline gap-1">
            <Text className="font-mono text-2xl text-paper">
              {bestLoadKg ?? "—"}
            </Text>
            <Text className="font-sans text-xs text-fog">kg no melhor dia</Text>
          </View>
        </View>

        {sessions > 1 ? (
          <View className="items-end">
            <Text className="font-sans text-[11px] text-fog">
              desde o início
            </Text>
            <View className="mt-0.5 flex-row items-baseline gap-1">
              <Text
                className="font-mono text-sm"
                style={{ color: rising ? colors.voltLime : colors.fogMuted }}
              >
                {deltaKg > 0 ? "+" : ""}
                {deltaKg}
              </Text>
              <Text className="font-sans text-[11px] text-fog">kg</Text>
            </View>
          </View>
        ) : null}
      </View>

      {sessions > 1 ? (
        <>
          <View className="mt-3">
            <LineChart
              labels={points.map(() => "")}
              series={[
                {
                  key: "top-load",
                  values: points.map((p) => p.topLoadKg),
                  color: colors.voltLime,
                  area: true,
                },
              ]}
              height={80}
              showDots={sessions <= 12}
            />
          </View>
          <Text className="mt-2 font-sans text-[11px] text-fog">
            {sessions} sessões registradas
          </Text>
        </>
      ) : (
        <Text className="mt-2 font-sans text-[11px] text-fog">
          A curva aparece a partir da segunda sessão.
        </Text>
      )}
    </GlassCard>
  );
}

/** Volt a 15% — fundo do selo de recorde. */
const PR_TINT = "rgba(176, 236, 0, 0.15)";
