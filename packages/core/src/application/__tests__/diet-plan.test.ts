import type { BodyAssessment } from "../../domain/entities/body-assessment";
import type { NutritionPlan } from "../../domain/entities/nutrition-plan";
import { BusinessRuleError } from "../../domain/errors";
import { GenerateDietPlanUseCase } from "../use-cases/diet-plan";
import {
  FakeConnectivity,
  FakePlanGenerationGateway,
  InMemoryAssessments,
  InMemoryTrainingProfiles,
} from "../../testing/fakes";

const MACRO = { grams: 100, rationale: "." };
const DIETA: NutritionPlan = {
  id: "dieta-1",
  assessmentId: "nova",
  userId: "user-1",
  caloriesTarget: 2200,
  macros: { protein: MACRO, carbs: MACRO, fat: MACRO },
  micros: [],
  dietGuidance: "Coma bem.",
  model: "gemini",
  createdAt: new Date("2026-11-16T10:00:00Z"),
};

function avaliacao(id: string, createdAt: string, status: BodyAssessment["status"] = "reviewed"): BodyAssessment {
  return {
    id,
    userId: "user-1",
    pdfPath: null,
    source: "manual",
    status,
    extracted: { weightKg: 80, bodyFatPct: null, muscleMassKg: null, measurements: [], assessmentDate: null, notes: null },
    errorMessage: null,
    createdAt: new Date(createdAt),
  };
}

async function deps(opts: { online?: boolean; perfil?: boolean; avaliacoes?: BodyAssessment[] } = {}) {
  const profiles = new InMemoryTrainingProfiles();
  if (opts.perfil ?? true) {
    await profiles.save({
      userId: "user-1", sex: "feminino", birthDate: "1998-01-10", heightCm: 165, goal: "forca",
      level: "iniciante", daysPerWeek: 2, minutesPerSession: 45, restrictions: "", sensitiveRegions: [],
      unavailableExercises: [], dislikedFoods: [],
    });
  }
  const assessments = new InMemoryAssessments(
    opts.avaliacoes ?? [avaliacao("antiga", "2026-10-01"), avaliacao("nova", "2026-11-10"), avaliacao("pendente", "2026-11-12", "pending_review")],
  );
  const gateway = new FakePlanGenerationGateway();
  const useCase = new GenerateDietPlanUseCase(assessments, profiles, gateway, new FakeConnectivity(opts.online ?? true));
  return { gateway, useCase };
}

describe("GenerateDietPlanUseCase", () => {
  it("gera a partir da avaliação revisada mais recente", async () => {
    const { gateway, useCase } = await deps();
    gateway.respostasDieta.push({ status: "done", plan: DIETA });

    const r = await useCase.generate("user-1");

    expect(r).toEqual({ ok: true, valor: { status: "done", plan: DIETA } });
    expect(gateway.pedidos).toEqual([{ assessmentId: "nova" }]);
  });

  it("cota da IA esgotada: devolve o pedido na fila", async () => {
    const { gateway, useCase } = await deps();
    gateway.respostasDieta.push({ status: "queued", generationId: "g-1" });
    const r = await useCase.generate("user-1");
    expect(r).toEqual({ ok: true, valor: { status: "queued", generationId: "g-1" } });
  });

  it("retoma um pedido da fila pelo id, mesmo sem perfil", async () => {
    const { gateway, useCase } = await deps({ perfil: false });
    gateway.respostasDieta.push({ status: "done", plan: DIETA });
    const r = await useCase.resume("user-1", "g-1");
    expect(r.ok).toBe(true);
    expect(gateway.pedidos).toEqual([{ generationId: "g-1" }]);
  });

  it("pedido de mudança vai com o texto da pessoa, sem espaços nas pontas", async () => {
    const { gateway, useCase } = await deps();
    gateway.respostasDieta.push({ status: "done", plan: { ...DIETA, id: "dieta-2" } });
    const r = await useCase.requestChange("user-1", "  não como carne vermelha  ");
    expect(r.ok).toBe(true);
    expect(gateway.pedidos).toEqual([{ feedback: "não como carne vermelha" }]);
  });

  it("pedido de mudança curto demais é recusado sem chamar a IA", async () => {
    const { gateway, useCase } = await deps();
    const r = await useCase.requestChange("user-1", " ok ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro.tipo).toBe("dados-invalidos");
    expect(gateway.pedidos).toHaveLength(0);
  });

  it("sem perfil, pede para preencher antes", async () => {
    const { gateway, useCase } = await deps({ perfil: false });
    const r = await useCase.generate("user-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro.mensagem).toContain("perfil");
    expect(gateway.pedidos).toHaveLength(0);
  });

  it("sem avaliação revisada, pede para registrar uma", async () => {
    const { gateway, useCase } = await deps({ avaliacoes: [avaliacao("p", "2026-11-12", "pending_review")] });
    const r = await useCase.generate("user-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro.mensagem).toContain("avaliação");
    expect(gateway.pedidos).toHaveLength(0);
  });

  it("sem internet, avisa antes de tentar", async () => {
    const { gateway, useCase } = await deps({ online: false });
    const r = await useCase.generate("user-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro.mensagem).toContain("internet");
    expect(gateway.pedidos).toHaveLength(0);
  });

  it("limite do servidor volta como regra de negócio, com a mensagem dele", async () => {
    const { gateway, useCase } = await deps();
    gateway.erro = new BusinessRuleError("Limite de pedidos do dia atingido. Tente amanhã.");
    const r = await useCase.generate("user-1");
    expect(r).toEqual({
      ok: false,
      erro: { tipo: "regra-de-negocio", mensagem: "Limite de pedidos do dia atingido. Tente amanhã." },
    });
  });
});
