import { ActivityIndicator, Text, View } from "react-native";
import { CloudOff, Salad } from "lucide-react-native";
import { colors } from "@px/tokens";
import type { MacroTarget } from "@px/core";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { Readout } from "@/components/readout";
import { useLatestPlan } from "@/lib/remote";

const MACROS = [
  ["protein", "Proteína", colors.proteinCoral],
  ["carbs", "Carboidrato", colors.carbsAmber],
  ["fat", "Gordura", colors.fatViolet],
] as const;

function MacroRow({
  label,
  color,
  target,
}: {
  label: string;
  color: string;
  target: MacroTarget;
}) {
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <Text className="font-sans text-sm text-paper">{label}</Text>
        </View>
        <Readout value={target.grams} unit="g / dia" size={16} />
      </View>
      <Text className="mt-1.5 pl-4 font-sans text-xs leading-5 text-fog">
        {target.rationale}
      </Text>
    </View>
  );
}

/**
 * Plano nutricional real: alvos e orientações gerados pela IA a partir da
 * avaliação corporal (pipeline do web). Registro de refeições fica pra uma
 * etapa futura — por enquanto a tela é o plano, não o consumo do dia.
 */
export default function NutricaoScreen() {
  const plan = useLatestPlan();

  return (
    <Screen>
      <View className="mb-6">
        <Text className="font-sans text-sm text-fog">Nutrição</Text>
        <Text className="font-sans-semibold text-3xl text-paper">
          Seu plano
        </Text>
      </View>

      {plan.status === "loading" ? (
        <View className="items-center py-16">
          <ActivityIndicator color={colors.voltLime} />
        </View>
      ) : plan.status === "error" ? (
        <GlassCard className="items-center py-10">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
            <CloudOff size={24} color={colors.fogMuted} />
          </View>
          <Text className="mt-4 font-sans-semibold text-base text-paper">
            Sem conexão com o servidor
          </Text>
          <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">
            Verifique sua internet — o plano recarrega sozinho quando você
            voltar pra esta tela.
          </Text>
        </GlassCard>
      ) : !plan.data ? (
        <GlassCard className="items-center py-10">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
            <Salad size={24} color={colors.fogMuted} />
          </View>
          <Text className="mt-4 font-sans-semibold text-base text-paper">
            Nenhum plano gerado ainda
          </Text>
          <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">
            Envie o PDF da sua avaliação corporal no Px GYM web — a IA monta
            seu plano de calorias e macros a partir dela.
          </Text>
        </GlassCard>
      ) : (
        <View className="gap-5">
          <GlassCard>
            <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
              Meta diária
            </Text>
            <View className="mt-2">
              <Readout
                value={plan.data.caloriesTarget}
                unit="kcal / dia"
                size={28}
              />
            </View>
          </GlassCard>

          <GlassCard>
            <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
              Macros
            </Text>
            <View className="mt-4 gap-5">
              {MACROS.map(([key, label, color]) => (
                <MacroRow
                  key={key}
                  label={label}
                  color={color}
                  target={plan.data!.macros[key]}
                />
              ))}
            </View>
          </GlassCard>

          {plan.data.micros.length > 0 ? (
            <GlassCard>
              <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
                Micronutrientes
              </Text>
              <View className="mt-3 gap-3">
                {plan.data.micros.map((micro) => (
                  <View
                    key={micro.name}
                    className="flex-row items-baseline justify-between"
                  >
                    <Text className="font-sans text-sm text-paper">
                      {micro.name}
                    </Text>
                    <Readout
                      value={micro.targetAmount}
                      unit={micro.unit}
                      size={14}
                    />
                  </View>
                ))}
              </View>
            </GlassCard>
          ) : null}

          <GlassCard>
            <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
              Orientações
            </Text>
            <Text className="mt-3 font-sans text-sm leading-6 text-paper">
              {plan.data.dietGuidance}
            </Text>
            <Text className="mt-4 font-sans text-[11px] text-fog">
              Gerado em{" "}
              {plan.data.createdAt.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </GlassCard>
        </View>
      )}
    </Screen>
  );
}
