import type {
  AssessmentRepository,
  ConnectivityStatus,
  NutritionGenerationOutcome,
  PlanGenerationGateway,
  PlanGenerationRequest,
  TrainingProfileRepository,
} from "../../domain/contracts";
import { BusinessRuleError, InvalidValueError } from "../../domain/errors";
import { falha, falhaDoErro, sucesso, type Resultado } from "./resultado";

/**
 * Pede a dieta à IA (Edge Function generate-plan, parte "nutrition"). Mesmo
 * roteiro do treino: confere internet, perfil e avaliação revisada no
 * aparelho antes de gastar a cota com um pedido que o servidor recusaria.
 */
export class GenerateDietPlanUseCase {
  constructor(
    private readonly assessments: AssessmentRepository,
    private readonly profiles: TrainingProfileRepository,
    private readonly gateway: PlanGenerationGateway,
    private readonly connectivity: ConnectivityStatus,
  ) {}

  /** Dieta nova a partir da avaliação revisada mais recente. */
  async generate(userId: string): Promise<Resultado<NutritionGenerationOutcome>> {
    return this.pedir(userId, async () => {
      const avaliacao = await this.assessments.latestReviewed(userId);
      if (!avaliacao) {
        throw new BusinessRuleError("Registre uma avaliação corporal antes de gerar a dieta.");
      }
      return { assessmentId: avaliacao.id };
    });
  }

  /** Muda a dieta ativa: "não como carne vermelha". */
  async requestChange(userId: string, feedback: string): Promise<Resultado<NutritionGenerationOutcome>> {
    const texto = feedback.trim();
    if (texto.length < 3) return falha("dados-invalidos", "Conte o que você quer mudar na dieta.");
    if (texto.length > 500) return falha("dados-invalidos", "Resuma o pedido em até 500 caracteres.");
    return this.pedir(userId, async () => ({ feedback: texto }));
  }

  /** Tenta de novo um pedido que ficou na fila. */
  async resume(userId: string, generationId: string): Promise<Resultado<NutritionGenerationOutcome>> {
    return this.pedir(userId, async () => ({ generationId }), false);
  }

  private async pedir(
    userId: string,
    montar: () => Promise<PlanGenerationRequest>,
    exigePerfil = true,
  ): Promise<Resultado<NutritionGenerationOutcome>> {
    try {
      if (!(await this.connectivity.isOnline())) {
        return falha("falha-externa", "Sem internet agora. Gerar a dieta precisa de conexão.");
      }
      if (exigePerfil && !(await this.profiles.get(userId))) {
        throw new BusinessRuleError("Preencha seu perfil de treino antes de gerar a dieta.");
      }
      return sucesso(await this.gateway.generateNutrition(userId, await montar()));
    } catch (erro) {
      if (erro instanceof InvalidValueError) return falha("dados-invalidos", erro.message);
      return falhaDoErro(erro);
    }
  }
}
