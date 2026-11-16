import type { BodyAssessment } from "../../domain/entities/body-assessment";
import type { WorkoutPlan } from "../../domain/entities/workout-plan";
import { BusinessRuleError } from "../../domain/errors";
import {
  GenerateWorkoutPlanUseCase,
  LoadActiveWorkoutPlanUseCase,
} from "../use-cases/workout-plan";
import {
  FakeConnectivity,
  FakePlanGenerationGateway,
  InMemoryAssessments,
  InMemoryTrainingProfiles,
  InMemoryWorkoutPlans,
} from "../../testing/fakes";

const PLANO: WorkoutPlan = {
  id: "plano-1",
  userId: "user-1",
  name: "AB",
  rationale: "Dois dias.",
  sources: [],
  createdAt: new Date("2026-11-13T10:00:00Z"),
  days: [],
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
  const cache = new InMemoryWorkoutPlans();
  const connectivity = new FakeConnectivity(opts.online ?? true);
  const useCase = new GenerateWorkoutPlanUseCase(assessments, profiles, gateway, cache, connectivity);
  return { gateway, cache, useCase };
}

describe("GenerateWorkoutPlanUseCase", () => {
  it("gera a partir da avaliação revisada mais recente e guarda o treino no aparelho", async () => {
    const { gateway, cache, useCase } = await deps();
    gateway.respostas.push({ status: "done", plan: PLANO });

    const r = await useCase.generate("user-1");

    expect(r).toEqual({ ok: true, valor: { status: "done", plan: PLANO } });
    expect(gateway.pedidos).toEqual([{ assessmentId: "nova" }]);
    expect(await cache.get("user-1")).toEqual(PLANO);
  });

  it("cota da IA esgotada: o pedido fica na fila e nada é guardado", async () => {
    const { gateway, cache, useCase } = await deps();
    gateway.respostas.push({ status: "queued", generationId: "g-1" });

    const r = await useCase.generate("user-1");

    expect(r).toEqual({ ok: true, valor: { status: "queued", generationId: "g-1" } });
    expect(await cache.get("user-1")).toBeNull();
  });

  it("retoma um pedido da fila pelo id", async () => {
    const { gateway, useCase } = await deps();
    gateway.respostas.push({ status: "done", plan: PLANO });

    const r = await useCase.resume("user-1", "g-1");

    expect(r.ok).toBe(true);
    expect(gateway.pedidos).toEqual([{ generationId: "g-1" }]);
  });

  it("pedido de mudança vai com o texto da pessoa e atualiza o treino guardado", async () => {
    const { gateway, cache, useCase } = await deps();
    gateway.respostas.push({ status: "done", plan: { ...PLANO, id: "plano-2" } });

    const r = await useCase.requestChange("user-1", "  minha academia não tem leg press  ");

    expect(r.ok).toBe(true);
    expect(gateway.pedidos).toEqual([{ feedback: "minha academia não tem leg press" }]);
    expect((await cache.get("user-1"))?.id).toBe("plano-2");
  });

  it("pedido de mudança vazio ou curto demais é recusado sem chamar a IA", async () => {
    const { gateway, useCase } = await deps();
    const r = await useCase.requestChange("user-1", " ok ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro.tipo).toBe("dados-invalidos");
    expect(gateway.pedidos).toHaveLength(0);
  });

  it("sem perfil de treino, pede para preencher antes", async () => {
    const { gateway, useCase } = await deps({ perfil: false });
    const r = await useCase.generate("user-1");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erro.tipo).toBe("regra-de-negocio");
      expect(r.erro.mensagem).toContain("perfil");
    }
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
    if (!r.ok) {
      expect(r.erro.tipo).toBe("falha-externa");
      expect(r.erro.mensagem).toContain("internet");
    }
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

describe("LoadActiveWorkoutPlanUseCase", () => {
  function setup(online: boolean) {
    const remote = new InMemoryWorkoutPlans();
    const cache = new InMemoryWorkoutPlans();
    const useCase = new LoadActiveWorkoutPlanUseCase(remote, cache, new FakeConnectivity(online));
    return { remote, cache, useCase };
  }

  it("com internet, busca o treino ativo e atualiza o que está no aparelho", async () => {
    const { remote, cache, useCase } = setup(true);
    await remote.put(PLANO);
    await cache.put({ ...PLANO, id: "velho" });

    expect(await useCase.execute("user-1")).toEqual(PLANO);
    expect(await cache.get("user-1")).toEqual(PLANO);
  });

  it("sem internet, usa o treino guardado no aparelho", async () => {
    const { remote, cache, useCase } = setup(false);
    await remote.put({ ...PLANO, id: "novo" });
    await cache.put(PLANO);

    expect(await useCase.execute("user-1")).toEqual(PLANO);
  });

  it("servidor fora do ar: também usa o guardado", async () => {
    const { remote, cache, useCase } = setup(true);
    remote.get = () => Promise.reject(new Error("timeout"));
    await cache.put(PLANO);

    expect(await useCase.execute("user-1")).toEqual(PLANO);
  });

  it("servidor diz que não há treino ativo: limpa o guardado", async () => {
    const { cache, useCase } = setup(true);
    await cache.put(PLANO);

    expect(await useCase.execute("user-1")).toBeNull();
    expect(await cache.get("user-1")).toBeNull();
  });
});
