import { BusinessRuleError, type TrainingProfile } from "@px/core";
import type { PxSupabaseClient } from "../client";
import {
  SupabasePlanGenerationGateway,
  SupabaseTrainingProfileRepository,
  SupabaseWorkoutPlanRepository,
} from "../repositories/training-plans";

type Call = { table: string; op: string; args: unknown[] };

/** Client falso: select/eq/maybeSingle, upsert e functions.invoke. */
function fakeClient(opts: { row?: unknown; invoke?: { data?: unknown; error?: unknown } } = {}) {
  const calls: Call[] = [];
  const invokes: { name: string; body: unknown }[] = [];
  const client = {
    from(table: string) {
      const chain = {
        select(...args: unknown[]) {
          calls.push({ table, op: "select", args });
          return chain;
        },
        eq(...args: unknown[]) {
          calls.push({ table, op: "eq", args });
          return chain;
        },
        async maybeSingle() {
          return { data: opts.row ?? null, error: null };
        },
        async upsert(...args: unknown[]) {
          calls.push({ table, op: "upsert", args });
          return { data: null, error: null };
        },
      };
      return chain;
    },
    functions: {
      async invoke(name: string, options: { body: unknown }) {
        invokes.push({ name, body: options.body });
        return { data: opts.invoke?.data ?? null, error: opts.invoke?.error ?? null };
      },
    },
  };
  return { client: client as unknown as PxSupabaseClient, calls, invokes };
}

/** Imita o FunctionsHttpError do supabase-js: a Response vem em `context`. */
function httpError(status: number, body: unknown) {
  return { name: "FunctionsHttpError", context: new Response(JSON.stringify(body), { status }) };
}

const PERFIL: TrainingProfile = {
  userId: "user-1",
  sex: "feminino",
  birthDate: "1998-01-10",
  heightCm: 165.5,
  goal: "forca",
  level: "iniciante",
  daysPerWeek: 3,
  minutesPerSession: 45,
  restrictions: "dor no joelho",
  sensitiveRegions: ["joelho"],
  unavailableExercises: ["leg-press"],
  dislikedFoods: [],
};

const DIA = {
  label: "A",
  name: "Corpo todo",
  focus: "Força",
  estimatedMinutes: 45,
  exercises: [{ exerciseId: "agachamento-goblet", name: "Agachamento goblet", muscleGroup: "Pernas", sets: 3, reps: 10, restSeconds: 90, notes: "" }],
};

describe("SupabaseTrainingProfileRepository", () => {
  it("lê a linha do perfil e converte a altura que chega como texto", async () => {
    const { client, calls } = fakeClient({
      row: {
        user_id: "user-1", sex: "feminino", birth_date: "1998-01-10", height_cm: "165.5", goal: "forca",
        level: "iniciante", days_per_week: 3, minutes_per_session: 45, restrictions: "dor no joelho",
        sensitive_regions: ["joelho"], unavailable_exercises: ["leg-press"], disliked_foods: [],
        updated_at: "2026-11-13T10:00:00Z",
      },
    });

    expect(await new SupabaseTrainingProfileRepository(client).get("user-1")).toEqual(PERFIL);
    expect(calls).toContainEqual({ table: "user_profiles", op: "eq", args: ["user_id", "user-1"] });
  });

  it("sem perfil, devolve null", async () => {
    const { client } = fakeClient();
    expect(await new SupabaseTrainingProfileRepository(client).get("user-1")).toBeNull();
  });

  it("salva com upsert pelo user_id", async () => {
    const { client, calls } = fakeClient();

    await new SupabaseTrainingProfileRepository(client).save(PERFIL);

    const upsert = calls.find((c) => c.op === "upsert")!;
    expect(upsert.args[0]).toMatchObject({
      user_id: "user-1", sex: "feminino", birth_date: "1998-01-10", height_cm: 165.5, goal: "forca",
      level: "iniciante", days_per_week: 3, minutes_per_session: 45, restrictions: "dor no joelho",
      sensitive_regions: ["joelho"], unavailable_exercises: ["leg-press"], disliked_foods: [],
    });
    expect(upsert.args[1]).toEqual({ onConflict: "user_id" });
  });
});

describe("SupabaseWorkoutPlanRepository", () => {
  it("busca só o treino ativo da pessoa", async () => {
    const { client, calls } = fakeClient({
      row: { id: "w-1", user_id: "user-1", name: "Full body", rationale: "r", days: [DIA], sources: ["s"], created_at: "2026-11-13T10:00:00Z" },
    });

    const plano = await new SupabaseWorkoutPlanRepository(client).get("user-1");

    expect(plano).toEqual({
      id: "w-1", userId: "user-1", name: "Full body", rationale: "r", days: [DIA], sources: ["s"],
      createdAt: new Date("2026-11-13T10:00:00Z"),
    });
    expect(calls).toContainEqual({ table: "workout_plans", op: "eq", args: ["active", true] });
  });
});

describe("SupabasePlanGenerationGateway", () => {
  it("pede o treino com part=workout e monta o plano com o id da pessoa", async () => {
    const { client, invokes } = fakeClient({
      invoke: {
        data: { status: "done", workoutPlanId: "w-9", workout: { name: "Full body", rationale: "r", days: [DIA] }, sources: ["art"] },
      },
    });

    const r = await new SupabasePlanGenerationGateway(client).generateWorkout("user-1", { assessmentId: "a-1" });

    expect(invokes).toEqual([{ name: "generate-plan", body: { assessmentId: "a-1", part: "workout" } }]);
    expect(r.status).toBe("done");
    if (r.status === "done") {
      expect(r.plan).toMatchObject({ id: "w-9", userId: "user-1", name: "Full body", days: [DIA], sources: ["art"] });
    }
  });

  it("pedido de mudança também vai como treino; retomada vai só com o id", async () => {
    const { client, invokes } = fakeClient({ invoke: { data: { status: "queued", generationId: "g-1" } } });
    const gateway = new SupabasePlanGenerationGateway(client);

    expect(await gateway.generateWorkout("user-1", { feedback: "sem leg press" })).toEqual({ status: "queued", generationId: "g-1" });
    await gateway.generateWorkout("user-1", { generationId: "g-1" });

    expect(invokes.map((i) => i.body)).toEqual([{ feedback: "sem leg press", part: "workout" }, { generationId: "g-1" }]);
  });

  it("recusa do servidor (4xx) vira regra de negócio com a mensagem dele", async () => {
    const { client } = fakeClient({ invoke: { error: httpError(429, { error: "Limite de pedidos do dia atingido. Tente amanhã." }) } });

    const pedido = new SupabasePlanGenerationGateway(client).generateWorkout("user-1", { assessmentId: "a-1" });

    await expect(pedido).rejects.toBeInstanceOf(BusinessRuleError);
    await expect(pedido).rejects.toThrow("Limite de pedidos do dia atingido. Tente amanhã.");
  });

  it("falha do servidor (5xx) vira erro comum", async () => {
    const { client } = fakeClient({ invoke: { error: httpError(502, { error: "Não foi possível gerar o plano agora." }) } });

    const pedido = new SupabasePlanGenerationGateway(client).generateWorkout("user-1", { assessmentId: "a-1" });

    await expect(pedido).rejects.not.toBeInstanceOf(BusinessRuleError);
    await expect(pedido).rejects.toThrow("Não foi possível gerar o plano agora.");
  });
});
