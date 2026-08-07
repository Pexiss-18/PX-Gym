import { Text, View } from "react-native";
import { Ruler } from "lucide-react-native";
import { colors } from "@px/tokens";
import type { MeasurementDelta } from "@px/core";
import { GlassCard } from "./glass-card";

/**
 * Medidas corporais com variação vs. a avaliação anterior.
 *
 * Portada do MeasurementsCard do web. Convenção de cor: circunferência que
 * diminuiu é ganho (volt), que aumentou é coral — exceto braço/coxa/panturrilha,
 * onde crescer é o objetivo. Medida nova (sem par na anterior) fica neutra.
 */
export function MeasurementsCard({
  measurements,
}: {
  measurements: MeasurementDelta[];
}) {
  return (
    <GlassCard>
      <View className="flex-row items-center gap-2">
        <Ruler size={14} color={colors.fogMuted} strokeWidth={2.25} />
        <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
          Medidas
        </Text>
      </View>

      {measurements.length === 0 ? (
        <Text className="mt-3 font-sans text-sm text-fog">
          A avaliação mais recente não trouxe medidas de circunferência.
        </Text>
      ) : (
        <View className="mt-4">
          {measurements.map((m, index) => (
            <View
              key={m.label}
              className={`flex-row items-center justify-between py-3 ${
                index < measurements.length - 1 ? "border-b border-hairline" : ""
              }`}
            >
              <Text className="font-sans text-sm text-fog">{m.label}</Text>
              <View className="flex-row items-baseline gap-2">
                <Text className="font-mono text-sm text-paper">
                  {m.valueCm.toFixed(1)}
                </Text>
                <Text className="font-sans text-[11px] text-fog">cm</Text>
                {m.deltaCm === null ? null : (
                  <Text
                    className="font-mono text-[11px]"
                    style={{ color: deltaColor(m) }}
                  >
                    {m.deltaCm > 0 ? "+" : ""}
                    {m.deltaCm}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </GlassCard>
  );
}

/** Medidas onde crescer é ganho; nas demais, encolher é ganho. */
const GROWTH_IS_GOOD = ["braco", "coxa", "panturrilha", "peito", "ombro"];

function deltaColor(m: MeasurementDelta): string {
  if (m.deltaCm === null || m.deltaCm === 0) return colors.fogMuted;
  const normalized = m.label
    .toLowerCase()
    .normalize("NFD")
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x300 || code > 0x36f;
    })
    .join("");
  const growthIsGood = GROWTH_IS_GOOD.some((k) => normalized.includes(k));
  const isGood = growthIsGood ? m.deltaCm > 0 : m.deltaCm < 0;
  return isGood ? colors.voltLime : colors.fogMuted;
}
