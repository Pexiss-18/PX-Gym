import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { colors } from "@px/tokens";

/**
 * Botão primário do sistema: pill volt-lime, texto ink-surface, único
 * feedback de toque é o scale 0.98 (mesma regra do web).
 */
export function PillButton({
  children,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}: PropsWithChildren<{
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "ghost";
}>) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center gap-2 rounded-full py-3.5 px-6 active:scale-[0.98] ${
        isPrimary ? "bg-volt" : "border border-hairline bg-glass-fill"
      } ${disabled || loading ? "opacity-60" : ""}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary ? colors.inkSurface : colors.paperForeground}
        />
      ) : null}
      <Text
        className={`font-sans-semibold text-sm ${
          isPrimary ? "text-surface" : "text-paper"
        }`}
      >
        {children}
      </Text>
    </Pressable>
  );
}
