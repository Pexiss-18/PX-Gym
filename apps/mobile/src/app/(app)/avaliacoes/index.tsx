import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import { ClipboardList, CloudOff, Menu } from "lucide-react-native";
import { colors } from "@px/tokens";
import type { AssessmentStatus, BodyAssessment } from "@px/core";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { Readout } from "@/components/readout";
import { useAssessments } from "@/lib/remote";

const STATUS_LABEL: Record<AssessmentStatus, string> = {
  processing: "Processando",
  pending_review: "Aguardando revisão",
  reviewed: "Revisada",
  error: "Erro",
};

const STATUS_COLOR: Record<AssessmentStatus, string> = {
  processing: colors.fogMuted,
  pending_review: colors.carbsAmber,
  reviewed: colors.voltLime,
  error: colors.alertRed,
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function AssessmentCard({ assessment }: { assessment: BodyAssessment }) {
  const extracted = assessment.extracted;
  return (
    <GlassCard>
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-medium text-sm text-paper">
          {formatDate(assessment.createdAt)}
        </Text>
        <View className="flex-row items-center gap-1.5 rounded-full border border-hairline bg-glass-fill px-2.5 py-1">
          <View
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: STATUS_COLOR[assessment.status] }}
          />
          <Text className="font-sans text-[11px] text-fog">
            {STATUS_LABEL[assessment.status]}
          </Text>
        </View>
      </View>

      {extracted ? (
        <View className="mt-4 flex-row justify-between">
          <View>
            <Readout value={extracted.weightKg ?? "—"} unit="kg" size={20} />
            <Text className="mt-0.5 font-sans text-[11px] text-fog">peso</Text>
          </View>
          <View>
            <Readout value={extracted.bodyFatPct ?? "—"} unit="%" size={20} />
            <Text className="mt-0.5 font-sans text-[11px] text-fog">
              gordura
            </Text>
          </View>
          <View>
            <Readout
              value={extracted.muscleMassKg ?? "—"}
              unit="kg"
              size={20}
            />
            <Text className="mt-0.5 font-sans text-[11px] text-fog">
              músculo
            </Text>
          </View>
        </View>
      ) : assessment.status === "error" ? (
        <Text className="mt-3 font-sans text-xs text-fog">
          {assessment.errorMessage ??
            "Não foi possível processar o PDF desta avaliação."}
        </Text>
      ) : (
        <Text className="mt-3 font-sans text-xs text-fog">
          Os dados aparecem aqui quando o processamento terminar.
        </Text>
      )}
    </GlassCard>
  );
}

/** Histórico real das avaliações corporais enviadas pelo Px GYM web. */
export default function AvaliacoesScreen() {
  const navigation = useNavigation();
  const assessments = useAssessments();

  return (
    <Screen bottomInset={24}>
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="font-sans text-sm text-fog">Histórico</Text>
          <Text className="font-sans-semibold text-3xl text-paper">
            Avaliações
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
            Verifique sua internet — o histórico recarrega sozinho quando você
            voltar pra esta tela.
          </Text>
        </GlassCard>
      ) : assessments.data.length === 0 ? (
        <GlassCard className="items-center py-10">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
            <ClipboardList size={24} color={colors.fogMuted} />
          </View>
          <Text className="mt-4 font-sans-semibold text-base text-paper">
            Nenhuma avaliação por aqui ainda
          </Text>
          <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">
            Envie o PDF da sua avaliação corporal no Px GYM web e ela aparece
            aqui.
          </Text>
        </GlassCard>
      ) : (
        <View className="gap-4">
          {assessments.data.map((a) => (
            <AssessmentCard key={a.id} assessment={a} />
          ))}
        </View>
      )}
    </Screen>
  );
}
