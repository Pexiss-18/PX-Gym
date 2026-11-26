import type { BodyAssessment } from "../entities/body-assessment";
import { avaliacaoMaisNovaQueOPlano } from "../services/avaliacao-nova";

function avaliacao(id: string): BodyAssessment {
  return {
    id,
    userId: "user-1",
    pdfPath: null,
    source: "manual",
    status: "reviewed",
    extracted: null,
    errorMessage: null,
    createdAt: new Date("2026-11-10T12:00:00Z"),
  };
}

describe("avaliacaoMaisNovaQueOPlano", () => {
  it("sugere a avaliação nova quando o plano foi feito com outra", () => {
    const nova = avaliacao("av-2");
    expect(avaliacaoMaisNovaQueOPlano("av-1", nova)).toBe(nova);
  });

  it("não sugere quando o plano já usa a avaliação mais recente", () => {
    expect(avaliacaoMaisNovaQueOPlano("av-2", avaliacao("av-2"))).toBeNull();
  });

  it("não sugere sem avaliação revisada", () => {
    expect(avaliacaoMaisNovaQueOPlano("av-1", null)).toBeNull();
  });

  it("não sugere quando não se sabe de qual avaliação o plano veio", () => {
    expect(avaliacaoMaisNovaQueOPlano(undefined, avaliacao("av-2"))).toBeNull();
  });
});
