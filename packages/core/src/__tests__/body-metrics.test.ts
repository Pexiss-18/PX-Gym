import type {
  AssessmentMeasurement,
  BodyAssessment,
  ExtractedAssessment,
} from "../entities/body-assessment";
import { buildBodyHistory, historyDelta } from "../services/body-history";
import { diffMeasurements, measurementsFrom } from "../services/measurements";

function assessment(
  id: string,
  createdAt: string,
  extracted: Partial<ExtractedAssessment> | null,
): BodyAssessment {
  return {
    id,
    userId: "user-1",
    pdfPath: `${id}.pdf`,
    status: extracted ? "reviewed" : "processing",
    extracted: extracted
      ? {
          weightKg: null,
          bodyFatPct: null,
          muscleMassKg: null,
          measurements: [],
          assessmentDate: null,
          notes: null,
          ...extracted,
        }
      : null,
    errorMessage: null,
    createdAt: new Date(createdAt),
  };
}

function cm(label: string, valueCm: number): AssessmentMeasurement {
  return { label, valueCm };
}

describe("buildBodyHistory", () => {
  it("ordena por data da avaliação, não pela ordem de chegada", () => {
    const history = buildBodyHistory([
      assessment("c", "2026-08-01T10:00:00", {
        assessmentDate: "2026-07-30",
        weightKg: 79,
      }),
      assessment("a", "2026-06-01T10:00:00", {
        assessmentDate: "2026-05-30",
        weightKg: 82,
      }),
    ]);
    expect(history.map((p) => p.date)).toEqual(["2026-05-30", "2026-07-30"]);
  });

  it("descarta avaliações sem dados extraídos", () => {
    const history = buildBodyHistory([
      assessment("a", "2026-06-01T10:00:00", { weightKg: 82 }),
      assessment("b", "2026-07-01T10:00:00", null),
    ]);
    expect(history).toHaveLength(1);
  });

  it("cai pro createdAt quando o PDF não trouxe data", () => {
    const history = buildBodyHistory([
      assessment("a", "2026-06-15T10:00:00", { weightKg: 82 }),
    ]);
    expect(history[0]!.date).toBe("2026-06-15");
  });

  it("preserva null nas métricas que o PDF não trouxe", () => {
    const history = buildBodyHistory([
      assessment("a", "2026-06-15T10:00:00", { weightKg: 82 }),
    ]);
    expect(history[0]!.bodyFatPct).toBeNull();
    expect(history[0]!.muscleMassKg).toBeNull();
  });
});

describe("historyDelta", () => {
  const history = buildBodyHistory([
    assessment("a", "2026-05-01T10:00:00", { weightKg: 82, bodyFatPct: 18.9 }),
    assessment("b", "2026-06-01T10:00:00", { weightKg: 80.2 }),
    assessment("c", "2026-07-01T10:00:00", { weightKg: 78.4, bodyFatPct: 15.2 }),
  ]);

  it("mede do primeiro ao último ponto", () => {
    expect(historyDelta(history, "weightKg")).toBe(-3.6);
  });

  it("ignora os buracos da métrica", () => {
    expect(historyDelta(history, "bodyFatPct")).toBe(-3.7);
  });

  it("devolve null quando não há dois pontos", () => {
    expect(historyDelta(history, "muscleMassKg")).toBeNull();
    expect(historyDelta([], "weightKg")).toBeNull();
  });
});

describe("diffMeasurements", () => {
  it("calcula a variação por rótulo", () => {
    const deltas = diffMeasurements(
      [cm("Cintura", 81.2), cm("Braço", 37.8)],
      [cm("Cintura", 82.3), cm("Braço", 37.4)],
    );
    expect(deltas).toEqual([
      { label: "Cintura", valueCm: 81.2, deltaCm: -1.1 },
      { label: "Braço", valueCm: 37.8, deltaCm: 0.4 },
    ]);
  });

  it("casa rótulos com acentuação diferente", () => {
    const deltas = diffMeasurements([cm("Braço", 37.8)], [cm("BRACO", 37.4)]);
    expect(deltas[0]!.deltaCm).toBe(0.4);
  });

  it("deixa delta null na medida que é nova", () => {
    const deltas = diffMeasurements([cm("Panturrilha", 39)], [cm("Coxa", 58)]);
    expect(deltas[0]!.deltaCm).toBeNull();
  });

  it("deixa tudo null sem avaliação anterior", () => {
    const deltas = diffMeasurements([cm("Cintura", 81.2)], null);
    expect(deltas[0]!.deltaCm).toBeNull();
  });

  it("descarta medidas que só existiam na anterior", () => {
    const deltas = diffMeasurements([cm("Cintura", 81.2)], [
      cm("Cintura", 82),
      cm("Coxa", 58),
    ]);
    expect(deltas.map((d) => d.label)).toEqual(["Cintura"]);
  });
});

describe("measurementsFrom", () => {
  const latest = assessment("b", "2026-07-01T10:00:00", {
    measurements: [cm("Cintura", 81.2)],
  });
  const previous = assessment("a", "2026-06-01T10:00:00", {
    measurements: [cm("Cintura", 82.3)],
  });

  it("compara as duas avaliações", () => {
    expect(measurementsFrom(latest, previous)[0]!.deltaCm).toBe(-1.1);
  });

  it("funciona sem avaliação anterior", () => {
    expect(measurementsFrom(latest, null)[0]!.deltaCm).toBeNull();
  });

  it("devolve vazio quando não há medidas", () => {
    expect(measurementsFrom(null, null)).toEqual([]);
    expect(
      measurementsFrom(assessment("x", "2026-07-01T10:00:00", {}), null),
    ).toEqual([]);
  });
});
