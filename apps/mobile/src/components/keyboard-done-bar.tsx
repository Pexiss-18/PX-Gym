import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type KeyboardEvent,
} from "react-native";
import { Check } from "lucide-react-native";
import { colors } from "@px/tokens";
import { KEYBOARD_BAR_HEIGHT } from "./keyboard-aware";

/**
 * Barra "Confirmar" que aparece colada em cima do teclado (iOS). O teclado numérico
 * do iPhone (decimal-pad, numbers-and-punctuation) não tem tecla de
 * confirmar, então sem isso o usuário fica preso com o teclado aberto depois
 * de digitar altura, peso, data etc. No Android o teclado já traz a tecla de
 * concluir, então a barra não aparece lá.
 *
 * Renderizada uma vez só, na raiz do app: vale pra todo campo de texto.
 * (InputAccessoryView foi descontinuado no RN 0.88 e não desenha mais nada.)
 */
export function KeyboardDoneBar() {
  const [altura, setAltura] = useState(0);
  const visivel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const animar = (para: number, e: KeyboardEvent) =>
      Animated.timing(visivel, {
        toValue: para,
        duration: e.duration || 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

    const mostrar = Keyboard.addListener("keyboardWillShow", (e) => {
      setAltura(e.endCoordinates.height);
      animar(1, e);
    });
    const mudar = Keyboard.addListener("keyboardWillChangeFrame", (e) => {
      if (e.endCoordinates.height > 0) setAltura(e.endCoordinates.height);
    });
    const esconder = Keyboard.addListener("keyboardWillHide", (e) => {
      animar(0, e);
      setAltura(0);
    });
    return () => {
      mostrar.remove();
      mudar.remove();
      esconder.remove();
    };
  }, [visivel]);

  if (Platform.OS !== "ios" || altura === 0) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.barra,
        {
          bottom: altura,
          opacity: visivel,
          transform: [
            { translateY: visivel.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
          ],
        },
      ]}
    >
      <Pressable
        onPress={() => Keyboard.dismiss()}
        accessibilityRole="button"
        accessibilityLabel="Confirmar e fechar o teclado"
        // Estilo estático: o NativeWind descarta `style` em forma de função
        // no Pressable, e aí o fundo verde sumia (texto escuro em barra escura).
        style={styles.botao}
      >
        <Check size={20} color={colors.inkSurface} strokeWidth={2.75} />
        <Text className="font-sans-semibold" style={styles.texto}>Confirmar</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  barra: {
    position: "absolute",
    left: 0,
    right: 0,
    height: KEYBOARD_BAR_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: colors.inkSurface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairlineBorder,
  },
  // Largura total: alvo grande pro polegar e nada flutuante consegue cobrir.
  botao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: colors.voltLime,
  },
  texto: { color: colors.inkSurface, fontSize: 16 },
});
