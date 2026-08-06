import { Stack } from "expo-router";
import { colors } from "@px/tokens";

export default function TreinoLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.inkGround },
      }}
    />
  );
}
