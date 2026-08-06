import { Pressable, Text, View } from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import { ClipboardList, Menu } from "lucide-react-native";
import { colors } from "@px/tokens";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";

/**
 * Histórico de avaliações corporais — na etapa 5 esta tela passa a listar
 * as avaliações reais do Supabase (mesmos dados do pipeline de PDF do web).
 */
export default function AvaliacoesScreen() {
  const navigation = useNavigation();

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

      <GlassCard className="items-center py-10">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
          <ClipboardList size={24} color={colors.fogMuted} />
        </View>
        <Text className="mt-4 font-sans-semibold text-base text-paper">
          Nenhuma avaliação por aqui ainda
        </Text>
        <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">
          As avaliações enviadas pelo Px GYM web aparecem aqui assim que a
          sincronização for ligada.
        </Text>
      </GlassCard>
    </Screen>
  );
}
