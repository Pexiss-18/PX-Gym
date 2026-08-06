import { Text, View } from "react-native";
import {
  Drawer,
  DrawerContentScrollView,
  DrawerItem,
  type DrawerContentComponentProps,
} from "expo-router/drawer";
import { ClipboardList, Settings } from "lucide-react-native";
import { colors } from "@px/tokens";
import { user } from "@/lib/mock-data";

function PxDrawerContent(props: DrawerContentComponentProps) {
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ paddingTop: 48 }}
    >
      <View className="mb-6 px-4">
        <Text className="font-sans-semibold text-2xl text-paper">
          Px <Text className="text-volt">GYM</Text>
        </Text>
        <Text className="mt-1 font-sans text-sm text-fog">{user.name}</Text>
      </View>
      <DrawerItem
        label="Avaliações"
        labelStyle={{
          color: colors.paperForeground,
          fontFamily: "Geist_500Medium",
          fontSize: 14,
        }}
        icon={({ size }) => (
          <ClipboardList size={size ?? 20} color={colors.fogMuted} />
        )}
        onPress={() => props.navigation.navigate("avaliacoes")}
      />
      <DrawerItem
        label="Configurações"
        labelStyle={{
          color: colors.paperForeground,
          fontFamily: "Geist_500Medium",
          fontSize: 14,
        }}
        icon={({ size }) => (
          <Settings size={size ?? 20} color={colors.fogMuted} />
        )}
        onPress={() => props.navigation.navigate("configuracoes")}
      />
    </DrawerContentScrollView>
  );
}

export default function AppLayout() {
  return (
    <Drawer
      drawerContent={(props) => <PxDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        drawerStyle: {
          backgroundColor: colors.inkSurface,
          width: 288,
        },
        sceneStyle: { backgroundColor: colors.inkGround },
      }}
    >
      <Drawer.Screen name="(tabs)" />
      <Drawer.Screen name="avaliacoes" />
      <Drawer.Screen name="configuracoes" />
    </Drawer>
  );
}
