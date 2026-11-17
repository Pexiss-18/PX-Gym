import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Meal } from "@px/core";
import { GlassCard } from "@/components/glass-card";
import { gramas, MACROS_DA_REFEICAO, MealCard } from "@/components/meal-card";
import { Readout } from "@/components/readout";
import { cardapioDoDia, DIAS_DA_SEMANA, diaDeHoje, totalDoDia } from "@/lib/weekly-menu";

/**
 * Cardápio da semana: de segunda a domingo, o que comer em cada refeição.
 * O app reveza as opções equivalentes que a IA montou (sem gastar a cota de
 * novo), e a pessoa pode trocar qualquer refeição por outra opção.
 */
export function WeeklyMenu({ meals }: { meals: Meal[] }) {
  const hoje = diaDeHoje();
  const [dia, setDia] = useState(hoje);
  /** Trocas feitas na mão, por dia: { dia: { refeição: opção } }. */
  const [trocas, setTrocas] = useState<Record<number, Record<number, number>>>({});

  const refeicoes = useMemo(() => cardapioDoDia(meals, dia, trocas[dia]), [meals, dia, trocas]);
  const total = totalDoDia(refeicoes);

  function trocar(refeicao: number) {
    const atual = refeicoes[refeicao];
    if (!atual) return;
    const proxima = (atual.optionIndex + 1) % atual.meal.options.length;
    setTrocas((t) => ({ ...t, [dia]: { ...t[dia], [refeicao]: proxima } }));
  }

  return (
    <View className="gap-3">
      <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
        Cardápio da semana
      </Text>

      <View className="flex-row flex-wrap gap-2" accessibilityRole="tablist">
        {DIAS_DA_SEMANA.map((d, i) => {
          const on = i === dia;
          return (
            <Pressable
              key={d.curto}
              onPress={() => setDia(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={i === hoje ? `${d.nome}, hoje` : d.nome}
              className={`rounded-full border px-3.5 py-2 ${on ? "border-volt bg-volt" : "border-hairline bg-glass-fill"}`}
            >
              <Text className={`font-sans-medium text-sm ${on ? "text-surface" : "text-paper"}`}>
                {d.curto}
                {i === hoje ? " · hoje" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* total do dia: confirma que a combinação bate a meta */}
      <GlassCard>
        <View className="flex-row items-baseline justify-between">
          <Text className="font-sans-semibold text-base text-paper">{DIAS_DA_SEMANA[dia]!.nome}</Text>
          <Readout value={total.kcal} unit="kcal no dia" size={16} />
        </View>
        <View className="mt-2 flex-row gap-4">
          {MACROS_DA_REFEICAO.map(([chave, rotulo, cor]) => (
            <View key={chave} className="flex-row items-center gap-1">
              <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cor }} />
              <Text className="font-sans text-xs text-fog">{rotulo}</Text>
              <Text className="font-mono text-xs text-paper">{gramas(total[chave])}</Text>
              <Text className="font-sans text-xs text-fog">g</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      {refeicoes.map((r, i) => (
        <MealCard key={`${dia}-${i}`} meal={r.meal} optionIndex={r.optionIndex} onSwap={() => trocar(i)} />
      ))}
    </View>
  );
}
