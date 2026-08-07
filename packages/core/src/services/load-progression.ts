import type { SetLog } from "../entities/set-log";

/** Um dia de treino de um exercício, condensado pra plotagem. */
export type LoadProgressionPoint = {
  /** Dia da sessão em AAAA-MM-DD. */
  sessionDate: string;
  /** Maior carga levantada no dia — a "carga de trabalho" que interessa. */
  topLoadKg: number;
  /** Soma de carga × séries do dia; volume cresce mesmo quando a carga estaciona. */
  volumeKg: number;
  sets: number;
};

export type LoadProgressionSummary = {
  points: LoadProgressionPoint[];
  /** Diferença de carga entre a primeira e a última sessão (kg). */
  deltaKg: number;
  /** Maior carga já registrada no exercício. */
  bestLoadKg: number | null;
  /** true quando a última sessão bateu o recorde anterior. */
  isPersonalRecord: boolean;
};

/**
 * Agrupa registros de série por dia e resume a progressão de carga de um
 * exercício — o dado central do produto ("subi de peso" tem que ser óbvio).
 *
 * Aceita os logs em qualquer ordem; tombstones (syncStatus "deleted") já são
 * filtrados pelo repositório, então aqui todo log conta.
 */
export function computeLoadProgression(
  logs: SetLog[],
): LoadProgressionSummary {
  const byDate = new Map<string, LoadProgressionPoint>();

  for (const log of logs) {
    const kg = log.load.kg;
    const point = byDate.get(log.sessionDate);
    if (point) {
      point.topLoadKg = Math.max(point.topLoadKg, kg);
      point.volumeKg = round1(point.volumeKg + kg);
      point.sets++;
    } else {
      byDate.set(log.sessionDate, {
        sessionDate: log.sessionDate,
        topLoadKg: kg,
        volumeKg: kg,
        sets: 1,
      });
    }
  }

  const points = [...byDate.values()].sort((a, b) =>
    a.sessionDate.localeCompare(b.sessionDate),
  );

  if (points.length === 0) {
    return { points, deltaKg: 0, bestLoadKg: null, isPersonalRecord: false };
  }

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const bestLoadKg = points.reduce((max, p) => Math.max(max, p.topLoadKg), 0);
  const bestBefore = points
    .slice(0, -1)
    .reduce((max, p) => Math.max(max, p.topLoadKg), 0);

  return {
    points,
    deltaKg: round1(last.topLoadKg - first.topLoadKg),
    bestLoadKg,
    // Uma sessão só não é recorde: não há o que superar.
    isPersonalRecord: points.length > 1 && last.topLoadKg > bestBefore,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
