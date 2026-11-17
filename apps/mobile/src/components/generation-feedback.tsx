import { ActivityIndicator, Text, View } from "react-native";
import { router } from "expo-router";
import { colors } from "@px/tokens";
import { GlassCard } from "@/components/glass-card";
import { PillButton } from "@/components/pill-button";

export type GenerationError = {
  message: string;
  /** O que a pessoa precisa fazer antes, quando o motivo é conhecido. */
  fix: "profile" | "assessment" | null;
};

/** Mensagem do use case → erro com o atalho certo pro que falta preencher. */
export function toGenerationError(message: string): GenerationError {
  return {
    message,
    fix: /perfil/i.test(message) ? "profile" : /avalia/i.test(message) ? "assessment" : null,
  };
}

/** Mensagem de erro da geração, com o atalho pro que falta preencher. */
export function GenerationErrorMessage({ error }: { error: GenerationError }) {
  return (
    <View className="mt-4 gap-3">
      <Text className="font-sans text-sm text-protein">{error.message}</Text>
      {error.fix === "profile" ? (
        <PillButton variant="ghost" onPress={() => router.push("/perfil-treino")}>
          Preencher perfil de treino
        </PillButton>
      ) : null}
      {error.fix === "assessment" ? (
        <PillButton variant="ghost" onPress={() => router.push("/avaliacoes/nova")}>
          Registrar avaliação
        </PillButton>
      ) : null}
    </View>
  );
}

/** Enquanto a IA trabalha (pode levar até um minuto). */
export function GeneratingCard({ title, description }: { title: string; description: string }) {
  return (
    <GlassCard className="items-center py-10">
      <ActivityIndicator color={colors.voltLime} />
      <Text className="mt-4 font-sans-semibold text-base text-paper">{title}</Text>
      <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">{description}</Text>
    </GlassCard>
  );
}
