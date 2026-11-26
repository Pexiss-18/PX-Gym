import type { BodyAssessment } from "../entities/body-assessment";

/**
 * A avaliação revisada mais recente, quando o plano ativo (treino ou dieta)
 * foi feito com outra: é a deixa pra sugerir um plano novo. Plano sem a
 * avaliação de origem conhecida não gera sugestão, pra não insistir à toa.
 */
export function avaliacaoMaisNovaQueOPlano(
  avaliacaoDoPlano: string | undefined,
  maisRecente: BodyAssessment | null,
): BodyAssessment | null {
  if (!avaliacaoDoPlano || !maisRecente) return null;
  return maisRecente.id === avaliacaoDoPlano ? null : maisRecente;
}
