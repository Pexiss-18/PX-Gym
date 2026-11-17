import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from "react-native";

/**
 * Altura da barra "Confirmar" em cima do teclado (só no iOS; ver
 * keyboard-done-bar). As telas somam isso ao teclado.
 */
export const KEYBOARD_BAR_HEIGHT = Platform.OS === "ios" ? 68 : 0;

/** Folga entre o campo e a barra "Confirmar"/teclado. */
const FOLGA = 16;

/*
 * Campo focado sempre à vista, nas duas plataformas. O KeyboardAvoidingView
 * sozinho não resolvia: não sabia da barra "Confirmar" (que cobre ~70px em
 * cima do teclado no iPhone), e as abas nem o usavam. Aqui a tela que rola
 * ganha um espaço do tamanho do teclado + barra no fim e rola até o campo,
 * quando o teclado abre, quando outro campo ganha foco e quando um campo de
 * várias linhas cresce.
 */

const ouvintes = new Set<() => void>();

/** Campos chamam isto ao ganhar foco ou crescer: a tela confere se ficou à vista. */
export function pedirCampoVisivel() {
  // espera o layout do foco/crescimento assentar antes de medir
  setTimeout(() => ouvintes.forEach((ouvinte) => ouvinte()), 60);
}

export function useKeyboardAwareScroll() {
  const scrollRef = useRef<ScrollView>(null);
  const deslocamento = useRef(0);
  /** Topo do teclado, em coordenadas da janela; null = fechado. */
  const topoDoTeclado = useRef<number | null>(null);
  const [espaco, setEspaco] = useState(0);

  const garantirVisivel = useCallback(() => {
    const topo = topoDoTeclado.current;
    const campo = TextInput.State.currentlyFocusedInput?.();
    if (topo === null || !campo) return;
    campo.measureInWindow((_x, y, _w, altura) => {
      const limite = topo - KEYBOARD_BAR_HEIGHT - FOLGA;
      const fundoDoCampo = y + altura;
      if (fundoDoCampo > limite) {
        scrollRef.current?.scrollTo({ y: deslocamento.current + (fundoDoCampo - limite), animated: true });
      }
    });
  }, []);

  useEffect(() => {
    const abrir = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const fechar = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const aberto = Keyboard.addListener(abrir, (e) => {
      topoDoTeclado.current = e.endCoordinates.screenY;
      setEspaco(e.endCoordinates.height + KEYBOARD_BAR_HEIGHT + FOLGA);
      // depois que o espaço extra entrou no layout
      setTimeout(garantirVisivel, Platform.OS === "ios" ? 80 : 40);
    });
    const fechado = Keyboard.addListener(fechar, () => {
      topoDoTeclado.current = null;
      setEspaco(0);
    });
    ouvintes.add(garantirVisivel);
    return () => {
      aberto.remove();
      fechado.remove();
      ouvintes.delete(garantirVisivel);
    };
  }, [garantirVisivel]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    deslocamento.current = e.nativeEvent.contentOffset.y;
  }, []);

  return {
    scrollRef,
    /** Props pro ScrollView. */
    scrollProps: { onScroll, scrollEventThrottle: 16, keyboardShouldPersistTaps: "handled" as const },
    /** Altura do espaço no fim do conteúdo enquanto o teclado está aberto. */
    espaco,
  };
}
