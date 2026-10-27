import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { ChevronDown, ChevronUp, Play } from "lucide-react-native";
import { colors } from "@px/tokens";
import { GlassCard } from "@/components/glass-card";
import { ROTULO_NIVEL, linkDoVideo, type GuiaExercicio } from "@/lib/guia-exercicios";

/**
 * "Como fazer" do detalhe do exercício: nível e músculos sempre à vista, passo
 * a passo recolhido (as séries são o foco durante o treino) e o vídeo como
 * busca no YouTube — o dataset não tem imagem que a gente possa usar.
 */
export function ExerciseGuideCard({
  nomeDoExercicio,
  guia,
}: {
  nomeDoExercicio: string;
  guia: GuiaExercicio;
}) {
  const [aberto, setAberto] = useState(false);
  const Chevron = aberto ? ChevronUp : ChevronDown;

  return (
    <GlassCard className="p-4">
      <Text className="mb-3 font-sans-medium text-xs text-fog">Como fazer</Text>

      <View className="mb-1 flex-row flex-wrap gap-1.5">
        <Chip destaque>{ROTULO_NIVEL[guia.nivel]}</Chip>
        {guia.musculosPrimarios.map((m) => (
          <Chip key={m}>{m}</Chip>
        ))}
      </View>
      {guia.musculosSecundarios.length > 0 ? (
        <Text className="mt-1.5 font-sans text-[11px] text-fog">
          Também trabalha: {guia.musculosSecundarios.join(", ")}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setAberto((a) => !a)}
        accessibilityRole="button"
        accessibilityState={{ expanded: aberto }}
        className="mt-4 flex-row items-center justify-between border-t border-hairline pt-3"
      >
        <Text className="font-sans-semibold text-sm text-paper">Passo a passo</Text>
        <Chevron size={16} color={colors.fogMuted} />
      </Pressable>

      {aberto ? (
        <View className="mt-3 gap-3">
          {guia.passos.map((passo, i) => (
            <View key={i} className="flex-row gap-3">
              <Text className="w-4 font-mono text-xs text-volt">{i + 1}</Text>
              <Text className="flex-1 font-sans text-sm leading-5 text-paper">{passo}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={() => void Linking.openURL(linkDoVideo(nomeDoExercicio))}
        accessibilityRole="link"
        className="mt-4 flex-row items-center justify-center gap-2 rounded-full border border-hairline bg-glass-fill px-6 py-3 active:scale-[0.98]"
      >
        <Play size={14} color={colors.paperForeground} />
        <Text className="font-sans-semibold text-sm text-paper">Ver vídeo no YouTube</Text>
      </Pressable>
    </GlassCard>
  );
}

function Chip({ children, destaque = false }: { children: string; destaque?: boolean }) {
  return (
    <View
      className={`rounded-full border px-2.5 py-1 ${destaque ? "border-volt" : "border-hairline"}`}
    >
      <Text className={`font-sans-medium text-[11px] ${destaque ? "text-volt" : "text-paper"}`}>
        {children}
      </Text>
    </View>
  );
}
