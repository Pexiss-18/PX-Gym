import { BusinessRuleError } from "../../domain/errors";
import { ReadAssessmentPdfUseCase, PDF_MAX_BYTES } from "../use-cases/read-assessment-pdf";
import { FakeAssessmentPdfReader, FakeConnectivity } from "../../testing/fakes";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]); // "%PDF-1"
const LEITURA = {
  pdfPath: "user-1/abc.pdf",
  extracted: {
    weightKg: 81.4,
    bodyFatPct: 18.7,
    muscleMassKg: 36.8,
    measurements: [{ label: "Cintura", valueCm: 86.5 }],
    assessmentDate: "2026-11-12",
    notes: null,
  },
};

function deps(online = true) {
  const reader = new FakeAssessmentPdfReader(LEITURA);
  return { reader, useCase: new ReadAssessmentPdfUseCase(reader, new FakeConnectivity(online)) };
}

describe("ReadAssessmentPdfUseCase", () => {
  it("devolve os números lidos pra pessoa conferir", async () => {
    const { reader, useCase } = deps();
    const r = await useCase.execute("user-1", PDF);
    expect(r).toEqual({ ok: true, valor: LEITURA });
    expect(reader.lidos).toHaveLength(1);
  });

  it("arquivo que não é PDF é recusado sem subir", async () => {
    const { reader, useCase } = deps();
    const r = await useCase.execute("user-1", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toEqual({ tipo: "dados-invalidos", mensagem: "Escolha um arquivo PDF." });
    expect(reader.lidos).toHaveLength(0);
  });

  it("PDF acima de 15 MB é recusado sem subir", async () => {
    const { reader, useCase } = deps();
    const grande = new Uint8Array(PDF_MAX_BYTES + 1);
    grande.set(PDF);
    const r = await useCase.execute("user-1", grande);
    expect(r.ok).toBe(false);
    expect(reader.lidos).toHaveLength(0);
  });

  it("sem internet, avisa antes de tentar", async () => {
    const { reader, useCase } = deps(false);
    const r = await useCase.execute("user-1", PDF);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro.mensagem).toContain("internet");
    expect(reader.lidos).toHaveLength(0);
  });

  it("recusa do servidor (não é avaliação) volta com a mensagem dele", async () => {
    const { reader, useCase } = deps();
    reader.erro = new BusinessRuleError("Esse PDF não parece uma avaliação corporal.");
    const r = await useCase.execute("user-1", PDF);
    expect(r).toEqual({
      ok: false,
      erro: { tipo: "regra-de-negocio", mensagem: "Esse PDF não parece uma avaliação corporal." },
    });
  });
});
