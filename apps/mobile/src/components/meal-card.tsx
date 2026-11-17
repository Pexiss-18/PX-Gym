import { Pressable, Text, View } from "react-native";
import { RefreshCw } from "lucide-react-native";
import type { Meal } from "@px/core";
import { colors } from "@px/tokens";
import { GlassCard } from "@/components/glass-card";
import { Readout } from "@/components/readout";

export const MACROS_DA_REFEICAO = [
  ["protein", "P", colors.proteinCoral],
  ["carbs", "C", colors.carbsAmber],
  ["fat", "G", colors.fatViolet],
] as const;

/** 96.3 → "96,3"; 40 → "40". */
export const gramas = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

/**
 * Uma refeição do cardápio do dia: os alimentos da opção escolhida, com
 * gramas e medida caseira, e os totais calculados pela fórmula. "Trocar"
 * passa pra próxima opção equivalente (mesmas calorias).
 */
export function MealCard({
  meal,
  optionIndex,
  onSwap,
}: {
  meal: Meal;
  optionIndex: number;
  onSwap?: () => void;
}) {
  const opcao = meal.options[optionIndex];
  if (!opcao) return null;
  const podeTrocar = meal.options.length > 1 && onSwap;

  return (
    <GlassCard>
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-semibold text-base text-paper">{meal.name}</Text>
        <Readout value={opcao.kcal} unit="kcal" size={14} />
      </View>

      <View className="mt-3 gap-2.5">
        {opcao.foods.map((alimento, i) => (
          <View key={`${alimento.name}-${i}`} className="flex-row items-baseline justify-between gap-3">
            <View className="flex-1">
              <Text className="font-sans text-sm text-paper">{alimento.name}</Text>
              {alimento.measure ? (
                <Text className="font-sans text-xs text-fog">{alimento.measure}</Text>
              ) : null}
            </View>
            <Readout value={Math.round(alimento.grams)} unit="g" size={13} />
          </View>
        ))}
      </View>

      <View className="mt-4 flex-row items-center justify-between border-t border-hairline pt-3">
        <View className="flex-row gap-3">
          {MACROS_DA_REFEICAO.map(([chave, rotulo, cor]) => (
            <View key={chave} className="flex-row items-center gap-1">
              <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cor }} />
              <Text className="font-sans text-xs text-fog">{rotulo}</Text>
              <Text className="font-mono text-xs text-paper">{gramas(opcao[chave])}</Text>
            </View>
          ))}
        </View>
        {podeTrocar ? (
          <Pressable
            onPress={onSwap}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Trocar ${meal.name}: opção ${optionIndex + 1} de ${meal.options.length}`}
            className="flex-row items-center gap-1.5 rounded-full border border-hairline bg-glass-fill px-3 py-1.5"
          >
            <RefreshCw size={12} color={colors.paperForeground} />
            <Text className="font-sans-medium text-xs text-paper">Trocar</Text>
          </Pressable>
        ) : null}
      </View>
    </GlassCard>
  );
}
