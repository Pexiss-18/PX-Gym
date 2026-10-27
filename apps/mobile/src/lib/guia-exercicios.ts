import { GUIAS } from "./guia-exercicios.dados";

/**
 * Como executar cada exercício do catálogo: passo a passo, músculos e nível,
 * do exercicios-bd-ptbr (CC0). Sem imagens — as do dataset original não têm
 * licença; o visual fica por conta do vídeo no YouTube.
 */
export type GuiaExercicio = {
  /** id do exercício no exercicios-bd-ptbr */
  ref: string;
  nivel: "iniciante" | "intermediario" | "avancado";
  musculosPrimarios: string[];
  musculosSecundarios: string[];
  passos: string[];
};

export const ROTULO_NIVEL: Record<GuiaExercicio["nivel"], string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export function guiaDoExercicio(exercicioId: string): GuiaExercicio | null {
  return GUIAS[exercicioId] ?? null;
}

/**
 * Busca no YouTube em vez de um vídeo fixo: nada pra manter quando um vídeo
 * sai do ar, e o app do YouTube abre direto se estiver instalado.
 */
export function linkDoVideo(nomeDoExercicio: string): string {
  const busca = encodeURIComponent(`como fazer ${nomeDoExercicio}`);
  return `https://www.youtube.com/results?search_query=${busca}`;
}
