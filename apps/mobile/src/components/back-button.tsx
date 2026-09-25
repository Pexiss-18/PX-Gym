import { Pressable } from "react-native";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { colors } from "@px/tokens";

/**
 * Seta de voltar no padrão dos botões redondos de cabeçalho. Sem histórico
 * (ex.: tela aberta por deep link), cai no início em vez de não fazer nada.
 */
export function BackButton() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-glass-fill"
    >
      <ArrowLeft size={18} color={colors.paperForeground} />
    </Pressable>
  );
}
