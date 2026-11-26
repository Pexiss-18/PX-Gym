import { useState } from "react";
import { Text, View } from "react-native";
import { ClipboardCheck } from "lucide-react-native";
import { colors } from "@px/tokens";
import { avaliacaoMaisNovaQueOPlano } from "@px/core";
import { GlassCard } from "@/components/glass-card";
import { PillButton } from "@/components/pill-button";
import { GenerationErrorMessage, type GenerationError } from "@/components/generation-feedback";
import { useLatestReviewedAssessment } from "@/lib/remote";

const TEXTOS = {
  treino: { plano: "seu treino", botao: "Atualizar meu treino", novo: "um treino novo" },
  dieta: { plano: "sua dieta", botao: "Atualizar minha dieta", novo: "uma dieta nova" },
} as const;

// "Agora não" vale enquanto o app estiver aberto: some até a próxima avaliação
const dispensadas = new Set<string>();

/**
 * Convite pra refazer o treino ou a dieta quando chega uma avaliação revisada
 * mais nova que a usada no plano ativo. Não gera sozinho: cada geração do
 * zero conta no limite da avaliação.
 */
export function NewAssessmentCard({
  part,
  planAssessmentId,
  onUpdate,
  error,
  className = "",
}: {
  part: keyof typeof TEXTOS;
  planAssessmentId: string | undefined;
  onUpdate: () => void;
  /** Erro da geração pedida por este cartão. */
  error: GenerationError | null;
  className?: string;
}) {
  const recente = useLatestReviewedAssessment();
  const [, atualizar] = useState(0);
  const nova = avaliacaoMaisNovaQueOPlano(planAssessmentId, recente.data);
  if (!nova || dispensadas.has(`${part}:${nova.id}`)) return null;

  const t = TEXTOS[part];
  const data = nova.createdAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <GlassCard className={`gap-4 ${className}`}>
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-glass-strong">
          <ClipboardCheck size={18} color={colors.voltLime} />
        </View>
        <View className="flex-1">
          <Text className="font-sans-semibold text-base text-paper">Você tem uma avaliação nova</Text>
          <Text className="mt-1 font-sans text-sm leading-5 text-fog">
            A avaliação de {data} ainda não entrou em {t.plano}. A IA monta {t.novo} a partir das
            suas medidas atuais.
          </Text>
        </View>
      </View>
      <PillButton onPress={onUpdate}>{t.botao}</PillButton>
      <PillButton
        variant="ghost"
        onPress={() => {
          dispensadas.add(`${part}:${nova.id}`);
          atualizar((n) => n + 1);
        }}
      >
        Agora não
      </PillButton>
      {error ? <GenerationErrorMessage error={error} /> : null}
    </GlassCard>
  );
}
