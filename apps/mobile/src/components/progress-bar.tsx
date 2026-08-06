import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

/**
 * Barra de progresso do sistema: trilha branca 6%, fill via scaleX
 * (nunca width animada), origem à esquerda, 500ms ease-out.
 */
export function ProgressBar({
  fraction,
  color,
  height = 8,
}: {
  fraction: number;
  color: string;
  height?: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(1, Math.max(0, fraction)), {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [fraction, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <View
      className="w-full overflow-hidden rounded-full bg-glass-track"
      style={{ height }}
    >
      <Animated.View
        className="h-full w-full rounded-full"
        style={[{ backgroundColor: color, transformOrigin: "left" }, fillStyle]}
      />
    </View>
  );
}
