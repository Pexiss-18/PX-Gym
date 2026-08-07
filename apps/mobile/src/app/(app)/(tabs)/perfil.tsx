import { Pressable, Text, View } from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import { ChevronRight, ClipboardList, LogOut, Settings } from "lucide-react-native";
import { colors } from "@px/tokens";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/lib/auth-context";
import { displayName, initials } from "@/lib/identity";

export default function PerfilScreen() {
  const { session, signOut } = useAuth();
  const navigation = useNavigation();
  const name = displayName(session);

  const rows = [
    {
      icon: ClipboardList,
      label: "Avaliações",
      onPress: () => navigation.dispatch(DrawerActions.jumpTo("avaliacoes")),
    },
    {
      icon: Settings,
      label: "Configurações",
      onPress: () => navigation.dispatch(DrawerActions.jumpTo("configuracoes")),
    },
  ];

  return (
    <Screen>
      <View className="mb-6">
        <Text className="font-sans text-sm text-fog">Perfil</Text>
        <Text className="font-sans-semibold text-3xl text-paper">{name}</Text>
      </View>

      <View className="gap-5">
        <GlassCard>
          <View className="flex-row items-center gap-4">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-volt">
              <Text className="font-sans-semibold text-base text-surface">
                {initials(name)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-sans-semibold text-base text-paper">
                {name}
              </Text>
              <Text className="font-sans text-sm text-fog">
                {session?.user.email}
              </Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard className="p-2">
          {rows.map((row, i) => (
            <Pressable
              key={row.label}
              onPress={row.onPress}
              className={`flex-row items-center justify-between rounded-px-md p-3.5 active:bg-glass-fill ${
                i > 0 ? "mt-1" : ""
              }`}
            >
              <View className="flex-row items-center gap-3">
                <row.icon size={18} color={colors.fogMuted} />
                <Text className="font-sans-medium text-sm text-paper">
                  {row.label}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.fogMuted} />
            </Pressable>
          ))}
        </GlassCard>

        <Pressable
          onPress={signOut}
          className="flex-row items-center justify-center gap-2 rounded-full border border-hairline bg-glass-fill py-3.5 active:scale-[0.98]"
        >
          <LogOut size={16} color={colors.alertRed} />
          <Text className="font-sans-semibold text-sm text-alert">Sair</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
