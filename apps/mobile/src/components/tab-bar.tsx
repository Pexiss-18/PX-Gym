import { Pressable, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "expo-router/tabs";
import { Apple, Dumbbell, House, User } from "lucide-react-native";
import { colors, glass } from "@px/tokens";

const ICONS: Record<string, typeof House> = {
  index: House,
  treino: Dumbbell,
  nutricao: Apple,
  perfil: User,
};

const LABELS: Record<string, string> = {
  index: "Início",
  treino: "Treino",
  nutricao: "Nutrição",
  perfil: "Perfil",
};

/**
 * Bottom nav do DESIGN.md: pill flutuante centralizada, glass-strong (blur
 * real aqui, é a exceção que precisa ler sobre conteúdo rolando), item ativo
 * com chip lime a 14% e ícone+label volt. Única sombra permitida no sistema.
 */
export function PxTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0 items-center px-4"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <View
        className="w-full max-w-sm overflow-hidden rounded-px-xl border border-hairline"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 30,
          shadowOpacity: 0.4,
          elevation: 12,
          backgroundColor: "rgba(10, 11, 14, 0.72)",
        }}
      >
        <BlurView
          intensity={40}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={{ backgroundColor: glass.fillStrong }}
        >
          <View className="flex-row items-center justify-between px-2 py-2">
            {state.routes.map((route, index) => {
              const active = state.index === index;
              const Icon = ICONS[route.name] ?? House;
              return (
                <Pressable
                  key={route.key}
                  onPress={() => {
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!active && !event.defaultPrevented) {
                      navigation.navigate(route.name);
                    }
                  }}
                  className="relative flex-1 items-center gap-1 rounded-px-md py-2"
                >
                  {active ? (
                    <View
                      className="absolute inset-x-2 inset-y-0 rounded-px-md"
                      style={{ backgroundColor: "rgba(176, 236, 0, 0.14)" }}
                    />
                  ) : null}
                  <Icon
                    size={20}
                    strokeWidth={2.25}
                    color={active ? colors.voltLime : colors.fogMuted}
                  />
                  <Text
                    className={`text-[11px] font-sans-medium ${
                      active ? "text-volt" : "text-fog"
                    }`}
                  >
                    {LABELS[route.name] ?? route.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}
