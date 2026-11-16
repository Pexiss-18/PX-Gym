import type {
  ActiveWorkoutPlanSource,
  AssessmentRepository,
  ConnectivityStatus,
  PlanGenerationGateway,
  PlanGenerationRequest,
  TrainingProfileRepository,
  WorkoutGenerationOutcome,
  WorkoutPlanCache,
} from "../../domain/contracts";
import type { WorkoutPlan } from "../../domain/entities/workout-plan";
import { BusinessRuleError, InvalidValueError } from "../../domain/errors";
import { falha, falhaDoErro, sucesso, type Resultado } from "./resultado";

/**
 * Pede o treino à IA (Edge Function generate-plan). Confere antes o que dá
 * pra conferir no aparelho — internet, perfil e avaliação revisada — pra não
 * gastar a cota com um pedido que o servidor vai recusar. Treino pronto
 * fica guardado no aparelho.
 */
export class GenerateWorkoutPlanUseCase {
  constructor(
    private readonly assessments: AssessmentRepository,
    private readonly profiles: TrainingProfileRepository,
    private readonly gateway: PlanGenerationGateway,
    private readonly cache: WorkoutPlanCache,
    private readonly connectivity: ConnectivityStatus,
  ) {}

  /** Treino novo a partir da avaliação revisada mais recente. */
  async generate(userId: string): Promise<Resultado<WorkoutGenerationOutcome>> {
    return this.pedir(userId, async () => {
      const avaliacao = await this.assessments.latestReviewed(userId);
      if (!avaliacao) {
        throw new BusinessRuleError("Registre uma avaliação corporal antes de gerar o treino.");
      }
      return { assessmentId: avaliacao.id };
    });
  }

  /** Muda o treino ativo: "minha academia não tem leg press". */
  async requestChange(userId: string, feedback: string): Promise<Resultado<WorkoutGenerationOutcome>> {
    const texto = feedback.trim();
    if (texto.length < 3) return falha("dados-invalidos", "Conte o que você quer mudar no treino.");
    if (texto.length > 500) return falha("dados-invalidos", "Resuma o pedido em até 500 caracteres.");
    return this.pedir(userId, async () => ({ feedback: texto }));
  }

  /** Tenta de novo um pedido que ficou na fila. */
  async resume(userId: string, generationId: string): Promise<Resultado<WorkoutGenerationOutcome>> {
    return this.pedir(userId, async () => ({ generationId }), false);
  }

  private async pedir(
    userId: string,
    montar: () => Promise<PlanGenerationRequest>,
    exigePerfil = true,
  ): Promise<Resultado<WorkoutGenerationOutcome>> {
    try {
      if (!(await this.connectivity.isOnline())) {
        return falha("falha-externa", "Sem internet agora. Gerar o treino precisa de conexão.");
      }
      if (exigePerfil && !(await this.profiles.get(userId))) {
        throw new BusinessRuleError("Preencha seu perfil de treino antes de gerar o treino.");
      }
      const resultado = await this.gateway.generateWorkout(userId, await montar());
      if (resultado.status === "done") await this.cache.put(resultado.plan);
      return sucesso(resultado);
    } catch (erro) {
      if (erro instanceof InvalidValueError) return falha("dados-invalidos", erro.message);
      return falhaDoErro(erro);
    }
  }
}

/**
 * Treino ativo: do servidor quando há internet (e a cópia do aparelho é
 * atualizada); da cópia do aparelho quando não há ou o servidor falha.
 */
export class LoadActiveWorkoutPlanUseCase {
  constructor(
    private readonly remote: ActiveWorkoutPlanSource,
    private readonly cache: WorkoutPlanCache,
    private readonly connectivity: ConnectivityStatus,
  ) {}

  async execute(userId: string): Promise<WorkoutPlan | null> {
    if (await this.connectivity.isOnline()) {
      try {
        const plano = await this.remote.get(userId);
        if (plano) await this.cache.put(plano);
        else await this.cache.clear(userId);
        return plano;
      } catch {
        // servidor fora do ar: segue com a cópia do aparelho
      }
    }
    return this.cache.get(userId);
  }
}
