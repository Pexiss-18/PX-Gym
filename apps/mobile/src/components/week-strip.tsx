import { Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { colors } from "@px/tokens";
import type { WeekActivityDay } from "@px/core";

/**
 * Faixa dos últimos 7 dias: círculo cheio em volt quando treinou, contorno
 * quando é hoje e ainda não treinou, vidro apagado no resto.
 *
 * Portada do WeekStrip do web, mas com dado real: no web a semana era mock.
 */
/** Volt a 12% — realce do dia de hoje sem competir com o círculo preenchido. */
const TODAY_TINT = "rgba(176, 236, 0, 0.12)";

export function WeekStrip({ days }: { days: WeekActivityDay[] }) {
  return (
    <View className="flex-row items-center justify-between rounded-px-xl border border-hairline bg-glass-fill p-3">
      {days.map((day) => (
        <View
          key={day.date}
          className="flex-1 items-center gap-2 rounded-px-md py-2"
          style={day.isToday ? { backgroundColor: TODAY_TINT } : undefined}
        >
          <Text
            className={`font-sans-medium text-[11px] uppercase ${
              day.isToday ? "text-volt" : "text-fog"
            }`}
          >
            {day.label}
          </Text>
          <View
            className={`h-7 w-7 items-center justify-center rounded-full ${
              day.done
                ? "bg-volt"
                : day.isToday
                  ? "border-2 border-volt"
                  : "bg-glass-strong"
            }`}
          >
            {day.done ? (
              <Check size={14} color={colors.inkSurface} strokeWidth={3} />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}
