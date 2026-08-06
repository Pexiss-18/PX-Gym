import { Stack } from "expo-router";
import { colors } from "@px/tokens";

export default function AvaliacoesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.inkGround },
      }}
    />
  );
}
