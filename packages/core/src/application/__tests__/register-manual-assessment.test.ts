import { RegisterManualAssessmentUseCase } from "../use-cases/register-manual-assessment";
import { FixedClock, InMemoryAssessments, SequenceIds } from "../../testing/fakes";

const NOW = new Date("2026-11-10T14:00:00Z");

function deps() {
  const assessments = new InMemoryAssessments();
  const useCase = new RegisterManualAssessmentUseCase(
    assessments,
    new FixedClock(NOW),
    new SequenceIds(),
  );
  return { assessments, useCase };
}

describe("RegisterManualAssessmentUseCase", () => {
  it("só com o peso: já nasce revisada, manual e sem PDF", async () => {
    const { assessments, useCase } = deps();

    const r = await useCase.execute({ userId: "user-1", weightKg: 82.4 });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toMatchObject({
      id: "id-1",
      userId: "user-1",
      pdfPath: null,
      source: "manual",
      status: "reviewed",
      errorMessage: null,
      createdAt: NOW,
    });
    expect(r.valor.extracted).toEqual({
      weightKg: 82.4,
      bodyFatPct: null,
      muscleMassKg: null,
      measurements: [],
      assessmentDate: "2026-11-10",
      notes: null,
    });
    expect(await assessments.latestReviewed("user-1")).toEqual(r.valor);
  });

  it("guarda gordura, massa muscular, medidas, data e observações", async () => {
    const { useCase } = deps();

    const r = await useCase.execute({
      userId: "user-1",
      weightKg: 70,
      bodyFatPct: 18.5,
      muscleMassKg: 32,
      assessmentDate: "2026-11-03",
      notes: "  Avaliação com o personal  ",
      measurements: [
        { label: " Cintura ", valueCm: 80 },
        { label: "Braço", valueCm: 34.5 },
      ],
    });

    expect(r.ok && r.valor.extracted).toEqual({
      weightKg: 70,
      bodyFatPct: 18.5,
      muscleMassKg: 32,
      measurements: [
        { label: "Cintura", valueCm: 80 },
        { label: "Braço", valueCm: 34.5 },
      ],
      assessmentDate: "2026-11-03",
      notes: "Avaliação com o personal",
    });
  });

  it("medida sem nome ou sem valor é ignorada; observação vazia vira null", async () => {
    const { useCase } = deps();

    const r = await useCase.execute({
      userId: "user-1",
      weightKg: 70,
      notes: "   ",
      measurements: [
        { label: "", valueCm: 80 },
        { label: "Quadril", valueCm: null },
        { label: "Coxa", valueCm: 55 },
      ],
    });

    expect(r.ok && r.valor.extracted?.measurements).toEqual([{ label: "Coxa", valueCm: 55 }]);
    expect(r.ok && r.valor.extracted?.notes).toBeNull();
  });

  it.each([
    [{ weightKg: 0 }, "peso"],
    [{ weightKg: 25 }, "peso"],
    [{ weightKg: 350 }, "peso"],
    [{ weightKg: Number.NaN }, "peso"],
    [{ weightKg: 70, bodyFatPct: 1 }, "gordura"],
    [{ weightKg: 70, bodyFatPct: 75 }, "gordura"],
    [{ weightKg: 70, muscleMassKg: 0 }, "massa muscular"],
    [{ weightKg: 70, muscleMassKg: 71 }, "massa muscular"],
    [{ weightKg: 70, measurements: [{ label: "Cintura", valueCm: 5 }] }, "Cintura"],
    [{ weightKg: 70, measurements: [{ label: "Cintura", valueCm: 300 }] }, "Cintura"],
    [{ weightKg: 70, assessmentDate: "2026-11-11" }, "futuro"],
    [{ weightKg: 70, assessmentDate: "10/11/2026" }, "data"],
  ])("valor fora da faixa é recusado sem gravar nada: %o", async (dados, trecho) => {
    const { assessments, useCase } = deps();

    const r = await useCase.execute({ userId: "user-1", ...dados });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro.tipo).toBe("dados-invalidos");
    expect(r.erro.mensagem).toContain(trecho);
    expect(assessments.assessments).toHaveLength(0);
  });

  it("falha do banco vira falha-externa, sem exceção", async () => {
    const { assessments, useCase } = deps();
    assessments.createManual = () => Promise.reject(new Error("sem rede"));

    const r = await useCase.execute({ userId: "user-1", weightKg: 70 });

    expect(r).toEqual({ ok: false, erro: { tipo: "falha-externa", mensagem: "sem rede" } });
  });
});
