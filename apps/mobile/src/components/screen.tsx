import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@px/tokens";

/**
 * Moldura padrão de tela: fundo ink-ground com os dois campos de cor
 * ambiente do DESIGN.md (lime no topo, coral na base, 5–7%, nos cantos,
 * nunca atrás da coluna de texto).
 *
 * `avoidKeyboard`: pra telas de formulário. Encolhe a área útil quando o
 * teclado sobe e deixa rolar, pra o campo focado nunca ficar escondido.
 * O conteúdo continua podendo centralizar (flex-1) quando o teclado some.
 */
export function Screen({
  children,
  scroll = true,
  bottomInset = 96,
  avoidKeyboard = false,
}: PropsWithChildren<{
  scroll?: boolean;
  bottomInset?: number;
  avoidKeyboard?: boolean;
}>) {
  const insets = useSafeAreaInsets();

  const body = (
    <View
      className="flex-1 px-5"
      style={{ paddingTop: insets.top + 12, paddingBottom: bottomInset }}
    >
      {children}
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.inkGround }}>
      <View pointerEvents="none" className="absolute inset-0">
        <View
          className="absolute -top-24 -right-20 h-72 w-72 rounded-full"
          style={{
            experimental_backgroundImage:
              "radial-gradient(circle, rgba(176,236,0,0.07) 0%, rgba(176,236,0,0) 70%)",
          }}
        />
        <View
          className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full"
          style={{
            experimental_backgroundImage:
              "radial-gradient(circle, rgba(253,118,93,0.06) 0%, rgba(253,118,93,0) 70%)",
          }}
        />
      </View>
      {avoidKeyboard ? (
        // Edge-to-edge (padrão no SDK 57) desliga o adjustResize do Android,
        // então "padding" é o comportamento certo nas duas plataformas.
        <KeyboardAvoidingView className="flex-1" behavior="padding">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {body}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : scroll ? (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </View>
  );
}
