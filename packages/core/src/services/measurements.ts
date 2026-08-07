import type {
  AssessmentMeasurement,
  BodyAssessment,
} from "../entities/body-assessment";

/** Uma medida com a variação em relação à avaliação anterior. */
export type MeasurementDelta = {
  label: string;
  valueCm: number;
  /** null quando a medida não existia na avaliação anterior. */
  deltaCm: number | null;
};

/**
 * Casa as medidas da avaliação atual com as da anterior pelo rótulo.
 *
 * O PDF é lido por IA, então o rótulo pode variar em caixa/acento entre
 * avaliações ("Cintura" vs "cintura") — a comparação normaliza antes de casar.
 * Medidas que só existem na anterior são descartadas: o card mostra o retrato
 * de hoje, não o histórico.
 */
export function diffMeasurements(
  current: AssessmentMeasurement[],
  previous: AssessmentMeasurement[] | null | undefined,
): MeasurementDelta[] {
  const before = new Map(
    (previous ?? []).map((m) => [normalizeLabel(m.label), m.valueCm]),
  );

  return current.map((m) => {
    const past = before.get(normalizeLabel(m.label));
    return {
      label: m.label,
      valueCm: m.valueCm,
      deltaCm: past == null ? null : round1(m.valueCm - past),
    };
  });
}

/** Medidas da avaliação mais recente comparadas com a imediatamente anterior. */
export function measurementsFrom(
  latest: BodyAssessment | null | undefined,
  previous: BodyAssessment | null | undefined,
): MeasurementDelta[] {
  const current = latest?.extracted?.measurements ?? [];
  if (current.length === 0) return [];
  return diffMeasurements(current, previous?.extracted?.measurements);
}

function normalizeLabel(label: string): string {
  // NFD separa o acento da letra; descartar os combining marks (U+0300-U+036F)
  // faz a medida casar mesmo se a IA extrair o rótulo sem acento.
  const decomposed = label.trim().toLowerCase().normalize("NFD");
  let out = "";
  for (const ch of decomposed) {
    const code = ch.charCodeAt(0);
    if (code < 0x300 || code > 0x36f) out += ch;
  }
  return out;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
