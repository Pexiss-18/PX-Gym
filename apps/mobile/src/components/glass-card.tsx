import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";

/**
 * Card de vidro do DESIGN.md: fill branco 3%, hairline 1px, raio 1.75rem.
 * Sem sombra (No-Shadow Rule) e sem blur real por card — sobre o fundo
 * quase-preto o resultado visual é o mesmo, com custo de GPU zero; o blur
 * de verdade fica reservado pra bottom nav (glass-strong).
 */
export function GlassCard({
  children,
  strong = false,
  className = "",
  ...rest
}: PropsWithChildren<ViewProps & { strong?: boolean; className?: string }>) {
  return (
    <View
      className={`rounded-px-xl border border-hairline p-5 ${
        strong ? "bg-glass-strong" : "bg-glass-fill"
      } ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}
