import { Text, View } from "react-native";

/**
 * A Instrument Rule materializada: número em Geist Mono, unidade/palavra em
 * Geist Sans, nunca no mesmo nó de texto.
 */
export function Readout({
  value,
  unit,
  size = 28,
  color = "text-paper",
  unitColor = "text-fog",
}: {
  value: string | number;
  unit?: string;
  size?: number;
  color?: string;
  unitColor?: string;
}) {
  return (
    <View className="flex-row items-baseline gap-1">
      <Text className={`font-mono ${color}`} style={{ fontSize: size }}>
        {value}
      </Text>
      {unit ? (
        <Text className={`font-sans ${unitColor}`} style={{ fontSize: Math.max(11, size * 0.45) }}>
          {unit}
        </Text>
      ) : null}
    </View>
  );
}

/** Delta numérico: volt quando progresso, fog quando neutro, coral quando regressão de medida boa. */
export function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  const good = invert ? value < 0 : value > 0;
  const sign = value > 0 ? "+" : "";
  return (
    <Text
      className={`font-mono text-xs ${good ? "text-volt" : value === 0 ? "text-fog" : "text-fog"}`}
    >
      {sign}
      {value}
    </Text>
  );
}
