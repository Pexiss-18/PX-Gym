import { Pressable, Text, View } from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import { Menu } from "lucide-react-native";
import { colors } from "@px/tokens";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";

export default function ConfiguracoesScreen() {
  const navigation = useNavigation();

  return (
    <Screen bottomInset={24}>
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="font-sans-semibold text-3xl text-paper">
          Configurações
        </Text>
        <Pressable
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-glass-fill"
        >
          <Menu size={18} color={colors.paperForeground} />
        </Pressable>
      </View>

      <GlassCard>
        <Text className="font-sans text-sm text-fog">
          Preferências do app (unidades, notificações, conta) chegam junto com
          o polimento da etapa 8.
        </Text>
      </GlassCard>
    </Screen>
  );
}
