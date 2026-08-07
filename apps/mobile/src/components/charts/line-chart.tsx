import { Fragment, useState } from "react";
import { Text, View, type LayoutChangeEvent } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
  Line as SvgLine,
} from "react-native-svg";
import { glass } from "@px/tokens";
import {
  areaPath,
  domainOf,
  monotonePath,
  toSegments,
  type Point,
} from "./plot";

export type ChartSeries = {
  key: string;
  /** Um valor por rótulo do eixo x; null = sem medida naquele ponto. */
  values: (number | null)[];
  color: string;
  /** Preenche a área sob a curva com gradiente da própria cor. */
  area?: boolean;
};

/**
 * Gráfico de linha do sistema — react-native-svg puro, sem lib de charts.
 *
 * Cada série usa o PRÓPRIO domínio vertical: peso (~78 kg) e gordura (~15%)
 * convivem no mesmo quadro sem que um vire uma reta esmagada. Num gráfico de
 * telefone, dois eixos numéricos custam mais atenção do que entregam — a
 * leitura exata fica na legenda, aqui só mora a forma da tendência.
 */
export function LineChart({
  labels,
  series,
  height = 180,
  showDots = true,
}: {
  labels: string[];
  series: ChartSeries[];
  height?: number;
  showDots?: boolean;
}) {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  // Sem rótulos = sparkline: não reserva a faixa de texto embaixo.
  const hasLabels = labels.some((l) => l.length > 0);
  const padTop = 10;
  const padBottom = hasLabels ? 22 : 4;
  const padX = 8;
  const plotHeight = height - padTop - padBottom;

  const hasData = series.some((s) => s.values.some((v) => v !== null));

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && hasData ? (
        <Svg width={width} height={height}>
          <Defs>
            {series
              .filter((s) => s.area)
              .map((s) => (
                <LinearGradient
                  key={`grad-${s.key}`}
                  id={`grad-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor={s.color} stopOpacity={0.32} />
                  <Stop offset="1" stopColor={s.color} stopOpacity={0} />
                </LinearGradient>
              ))}
          </Defs>

          {/* grade horizontal discreta: 3 linhas, hairline, sem eixo */}
          {[0, 0.5, 1].map((t) => (
            <SvgLine
              key={`grid-${t}`}
              x1={0}
              x2={width}
              y1={padTop + plotHeight * t}
              y2={padTop + plotHeight * t}
              stroke={glass.track}
              strokeWidth={1}
            />
          ))}

          {series.map((s) => {
            const known = s.values.filter((v): v is number => v !== null);
            if (known.length === 0) return null;

            const [min, max] = domainOf(known);
            const span = max - min || 1;
            const usableWidth = Math.max(width - padX * 2, 1);
            const step =
              labels.length > 1 ? usableWidth / (labels.length - 1) : 0;

            const toPoint = (value: number, index: number): Point => ({
              x: padX + (labels.length > 1 ? step * index : usableWidth / 2),
              y: padTop + plotHeight * (1 - (value - min) / span),
            });

            return (
              <Fragment key={s.key}>
                {toSegments(s.values).map((segment) => {
                  const points = segment.values.map((v, i) =>
                    toPoint(v, segment.startIndex + i),
                  );
                  const line = monotonePath(points);
                  return (
                    <Fragment key={`seg-${segment.startIndex}`}>
                      {s.area ? (
                        <Path
                          d={areaPath(line, points, padTop + plotHeight)}
                          fill={`url(#grad-${s.key})`}
                        />
                      ) : null}
                      <Path
                        d={line}
                        stroke={s.color}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      {showDots
                        ? points.map((p, i) => (
                            <Circle
                              key={`dot-${segment.startIndex}-${i}`}
                              cx={p.x}
                              cy={p.y}
                              r={3}
                              fill={s.color}
                            />
                          ))
                        : null}
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}
        </Svg>
      ) : null}

      {/* rótulos do eixo x: primeiro, meio e último — mais que isso vira ruído */}
      {hasData && hasLabels ? (
        <View className="absolute inset-x-0 bottom-0 flex-row justify-between">
          {edgeLabels(labels).map((label, i) => (
            <Text key={`${label}-${i}`} className="font-sans text-[11px] text-fog">
              {label}
            </Text>
          ))}
        </View>
      ) : null}

      {hasData ? null : (
        <View className="flex-1 items-center justify-center">
          <Text className="font-sans text-sm text-fog">
            Sem dados suficientes pra desenhar a curva.
          </Text>
        </View>
      )}
    </View>
  );
}

/** Legenda: cor, nome e o valor atual — a leitura numérica exata vive aqui. */
export function ChartLegend({
  items,
}: {
  items: { label: string; value: string; unit: string; color: string }[];
}) {
  return (
    <View className="flex-row flex-wrap gap-x-5 gap-y-2">
      {items.map((item) => (
        <View key={item.label} className="flex-row items-center gap-1.5">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <Text className="font-sans text-xs text-fog">{item.label}</Text>
          <Text className="font-mono text-xs text-paper">{item.value}</Text>
          <Text className="font-sans text-xs text-fog">{item.unit}</Text>
        </View>
      ))}
    </View>
  );
}

function edgeLabels(labels: string[]): string[] {
  if (labels.length <= 3) return labels;
  const middle = labels[Math.floor((labels.length - 1) / 2)]!;
  return [labels[0]!, middle, labels[labels.length - 1]!];
}
