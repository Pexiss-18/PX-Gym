import { BusinessRuleError } from "../errors";
import type { NutritionPlan } from "../entities/nutrition-plan";
import type {
  AssessmentRepository,
  Clock,
  IdGenerator,
  NutritionPlanGenerator,
  NutritionPlanRepository,
} from "../ports";

export type GenerateNutritionPlanInput = {
  assessmentId: string;
  userId: string;
};

/**
 * Gera e persiste o plano nutricional diário a partir de uma avaliação
 * corporal já revisada pelo usuário. A regra "só gera plano de avaliação
 * revisada" mora aqui, não na UI.
 */
export class GenerateNutritionPlanUseCase {
  constructor(
    private readonly assessments: AssessmentRepository,
    private readonly generator: NutritionPlanGenerator,
    private readonly plans: NutritionPlanRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: GenerateNutritionPlanInput): Promise<NutritionPlan> {
    const assessment = await this.assessments.byId(input.assessmentId);
    if (!assessment || assessment.userId !== input.userId) {
      throw new BusinessRuleError("Avaliação não encontrada");
    }
    if (assessment.status !== "reviewed") {
      throw new BusinessRuleError(
        "O plano só pode ser gerado depois que a avaliação for revisada",
      );
    }

    const draft = await this.generator.generate(assessment);

    const plan: NutritionPlan = {
      ...draft,
      id: this.ids.next(),
      assessmentId: assessment.id,
      userId: input.userId,
      createdAt: this.clock.now(),
    };

    await this.plans.save(plan);
    return plan;
  }
}
