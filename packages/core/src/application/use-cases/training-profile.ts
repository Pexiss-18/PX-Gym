import type { Clock, TrainingProfileRepository } from "../../domain/contracts";
import type { RegiaoSensivel, TrainingProfile } from "../../domain/entities/training-profile";
import { InvalidValueError } from "../../domain/errors";
import { falhaDoErro, sucesso, type Resultado } from "./resultado";

/** O que a tela edita: as preferências aprendidas pela IA ficam de fora. */
export type TrainingProfileInput = Omit<TrainingProfile, "unavailableExercises" | "dislikedFoods">;

function faixa(valor: number, min: number, max: number, mensagem: string): number {
  if (!Number.isFinite(valor) || valor < min || valor > max) throw new InvalidValueError(mensagem);
  return valor;
}

/** Idade completa na data `hoje`, a partir de AAAA-MM-DD; lança se a data não existe. */
function idade(nascimento: string, hoje: Date): number {
  const m = nascimento.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [ano, mes, dia] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [NaN, NaN, NaN];
  const data = new Date(ano, mes - 1, dia);
  if (!m || data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
    throw new InvalidValueError("Informe a data de nascimento no formato AAAA-MM-DD.");
  }
  let anos = hoje.getFullYear() - ano;
  if (hoje.getMonth() < mes - 1 || (hoje.getMonth() === mes - 1 && hoje.getDate() < dia)) anos--;
  return anos;
}

/**
 * Salva o perfil de treino com as mesmas faixas do banco e da Edge Function,
 * pra pessoa saber na hora o que corrigir. Exercícios indisponíveis e
 * alimentos que a IA aprendeu nos pedidos de mudança são preservados.
 */
export class SaveTrainingProfileUseCase {
  constructor(
    private readonly profiles: TrainingProfileRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: TrainingProfileInput): Promise<Resultado<TrainingProfile>> {
    try {
      faixa(input.daysPerWeek, 2, 6, "Escolha de 2 a 6 dias de treino por semana.");
      if (!Number.isInteger(input.daysPerWeek)) throw new InvalidValueError("Escolha de 2 a 6 dias de treino por semana.");
      faixa(input.heightCm, 120, 230, "Informe uma altura entre 120 e 230 cm.");
      faixa(input.minutesPerSession, 20, 120, "Cada treino precisa ter entre 20 e 120 minutos.");
      faixa(idade(input.birthDate, this.clock.now()), 14, 90, "O app atende pessoas com idade entre 14 e 90 anos.");

      const atual = await this.profiles.get(input.userId);
      const perfil: TrainingProfile = {
        ...input,
        restrictions: input.restrictions.trim(),
        sensitiveRegions: [...new Set<RegiaoSensivel>(input.sensitiveRegions)],
        unavailableExercises: atual?.unavailableExercises ?? [],
        dislikedFoods: atual?.dislikedFoods ?? [],
      };
      await this.profiles.save(perfil);
      return sucesso(perfil);
    } catch (erro) {
      return falhaDoErro(erro);
    }
  }
}
