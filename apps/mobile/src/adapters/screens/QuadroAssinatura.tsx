import { useRef, useState } from "react";
import { StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, radius } from "@px/tokens";
import type { Traco } from "./assinatura-svg";

/**
 * Quadro de assinatura com o sistema de responder do próprio React Native
 * (sem biblioteca): cada toque abre um traço, cada movimento acrescenta um
 * ponto, e os traços viram <Path> do react-native-svg na hora.
 */
export function QuadroAssinatura({
  tracos,
  onChange,
}: {
  tracos: Traco[];
  onChange: (tracos: Traco[], tamanho: { largura: number; altura: number }) => void;
}) {
  const [tamanho, setTamanho] = useState({ largura: 300, altura: 180 });
  const atual = useRef<Traco[]>(tracos);
  atual.current = tracos;

  const ponto = (e: GestureResponderEvent) => ({
    x: e.nativeEvent.locationX,
    y: e.nativeEvent.locationY,
  });

  return (
    <View
      testID="quadro-assinatura"
      accessibilityLabel="Quadro de assinatura"
      style={styles.quadro}
      onLayout={(e: LayoutChangeEvent) =>
        setTamanho({ largura: e.nativeEvent.layout.width, altura: e.nativeEvent.layout.height })
      }
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => onChange([...atual.current, [ponto(e)]], tamanho)}
      onResponderMove={(e) => {
        const lista = atual.current;
        const ultimo = lista[lista.length - 1] ?? [];
        onChange([...lista.slice(0, -1), [...ultimo, ponto(e)]], tamanho);
      }}
    >
      <Svg width="100%" height="100%" pointerEvents="none">
        {tracos.map((t, i) => (
          <Path
            key={i}
            d={t.map((p, j) => `${j === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ")}
            stroke={colors.inkSurface}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </Svg>
      {tracos.length === 0 ? (
        <Text pointerEvents="none" style={styles.dica}>
          Assine aqui com o dedo
        </Text>
      ) : null}
      <View pointerEvents="none" style={styles.linhaBase} />
    </View>
  );
}

const styles = StyleSheet.create({
  quadro: {
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: "#f4f5f8",
    overflow: "hidden",
  },
  dica: {
    position: "absolute",
    alignSelf: "center",
    top: 76,
    color: "#a3a8b1",
    fontSize: 14,
  },
  linhaBase: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 36,
    height: 1,
    backgroundColor: "#a3a8b1",
  },
});
