import { Tabs } from "expo-router";
import { PxTabBar } from "@/components/tab-bar";
import { colors } from "@px/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <PxTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.inkGround },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="treino" />
      <Tabs.Screen name="nutricao" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
