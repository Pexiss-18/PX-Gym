import type { PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import { useKeyboardAwareScroll } from "./keyboard-aware";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@px/tokens";

/**
 * Moldura padrão de tela: fundo ink-ground com os dois campos de cor
 * ambiente do DESIGN.md (lime no topo, coral na base, 5–7%, nos cantos,
 * nunca atrás da coluna de texto).
 *
 * Toda tela que rola mantém o campo focado à vista quando o teclado sobe
 * (ver useKeyboardAwareScroll). `avoidKeyboard`: telas de formulário, que
 * rolam mesmo com `scroll={false}` e podem centralizar o conteúdo.
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
  const teclado = useKeyboardAwareScroll();

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
      {scroll || avoidKeyboard ? (
        <ScrollView
          ref={teclado.scrollRef}
          className="flex-1"
          // formulário: o conteúdo pode centralizar (flex-1) quando o teclado some
          contentContainerStyle={avoidKeyboard ? { flexGrow: 1 } : undefined}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          {...teclado.scrollProps}
        >
          {body}
          {teclado.espaco > 0 ? <View style={{ height: teclado.espaco }} /> : null}
        </ScrollView>
      ) : (
        body
      )}
    </View>
  );
}
