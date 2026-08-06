import { GenerateNutritionPlanUseCase } from "../use-cases/generate-nutrition-plan";
import { BusinessRuleError } from "../errors";
import type { BodyAssessment } from "../entities/body-assessment";
import type { NutritionPlanDraft } from "../entities/nutrition-plan";
import type { NutritionPlanGenerator } from "../ports";
import {
  FixedClock,
  InMemoryAssessments,
  InMemoryPlans,
  SequenceIds,
} from "../testing/fakes";

const NOW = new Date("2026-08-06T20:00:00");

const draft: NutritionPlanDraft = {
  caloriesTarget: 2400,
  macros: {
    protein: { grams: 160, rationale: "1.9g/kg" },
    carbs: { grams: 280, rationale: "energia de treino" },
    fat: { grams: 70, rationale: "mínimo hormonal" },
  },
  micros: [],
  dietGuidance: "Prioridade em proteína a cada refeição.",
  model: "claude-fable-5",
};

const generator: NutritionPlanGenerator = {
  generate: async () => draft,
};

function assessment(status: BodyAssessment["status"]): BodyAssessment {
  return {
    id: "a-1",
    userId: "user-1",
    pdfPath: "user-1/a-1.pdf",
    status,
    extracted: null,
    errorMessage: null,
    createdAt: NOW,
  };
}

describe("GenerateNutritionPlanUseCase", () => {
  const make = (a: BodyAssessment) => {
    const plans = new InMemoryPlans();
    const useCase = new GenerateNutritionPlanUseCase(
      new InMemoryAssessments([a]),
      generator,
      plans,
      new FixedClock(NOW),
      new SequenceIds(),
    );
    return { plans, useCase };
  };

  it("gera e persiste o plano de uma avaliação revisada", async () => {
    const { plans, useCase } = make(assessment("reviewed"));

    const plan = await useCase.execute({
      assessmentId: "a-1",
      userId: "user-1",
    });

    expect(plan.caloriesTarget).toBe(2400);
    expect(plan.assessmentId).toBe("a-1");
    expect(plans.plans).toHaveLength(1);
  });

  it("recusa avaliação ainda não revisada", async () => {
    const { plans, useCase } = make(assessment("pending_review"));

    await expect(
      useCase.execute({ assessmentId: "a-1", userId: "user-1" }),
    ).rejects.toThrow(BusinessRuleError);
    expect(plans.plans).toHaveLength(0);
  });

  it("recusa avaliação de outro usuário", async () => {
    const { useCase } = make(assessment("reviewed"));

    await expect(
      useCase.execute({ assessmentId: "a-1", userId: "intruso" }),
    ).rejects.toThrow(BusinessRuleError);
  });
});
