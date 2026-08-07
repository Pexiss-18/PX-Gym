import type { BodyAssessment } from "../entities/body-assessment";

/** Um ponto da evolução corporal, pronto pra plotar. */
export type BodyHistoryPoint = {
  /** AAAA-MM-DD: data da avaliação (ou do envio, se o PDF não trouxer data). */
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
};

/**
 * Ordena as avaliações no tempo e extrai só o que a curva precisa.
 *
 * Avaliações ainda em processamento (ou com erro) não têm `extracted` e são
 * descartadas — plotar um buraco no meio da série engana mais do que informa.
 * A data preferida é a do laudo; o createdAt é fallback porque nem todo PDF
 * traz data legível.
 */
export function buildBodyHistory(
  assessments: BodyAssessment[],
): BodyHistoryPoint[] {
  return assessments
    .filter((a) => a.extracted !== null)
    .map((a) => ({
      date: a.extracted?.assessmentDate ?? isoDate(a.createdAt),
      weightKg: a.extracted?.weightKg ?? null,
      bodyFatPct: a.extracted?.bodyFatPct ?? null,
      muscleMassKg: a.extracted?.muscleMassKg ?? null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Variação entre o primeiro e o último ponto que têm valor pra métrica. */
export function historyDelta(
  history: BodyHistoryPoint[],
  metric: "weightKg" | "bodyFatPct" | "muscleMassKg",
): number | null {
  const values = history
    .map((p) => p[metric])
    .filter((v): v is number => v !== null);
  if (values.length < 2) return null;
  return Math.round((values[values.length - 1]! - values[0]!) * 10) / 10;
}

function isoDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}
