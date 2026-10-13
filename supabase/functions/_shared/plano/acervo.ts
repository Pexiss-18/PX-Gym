/**
 * Acervo científico que embasa os planos. Cada artigo entra resumido (só o
 * que muda a prescrição) e vai inteiro no prompt; a IA devolve os ids que
 * usou, e o app mostra "baseado em".
 *
 * Curadoria manual: prefira artigos de acesso aberto e mantenha o resumo
 * curto — o plano gratuito limita os tokens por minuto.
 */
export type Artigo = {
  /** Slug estável, ex.: "schoenfeld-2017-volume". */
  id: string;
  titulo: string;
  /** Autores, periódico, ano e DOI/link. */
  referencia: string;
  /** Onde o artigo se aplica. */
  temas: ("treino" | "nutricao")[];
  /** Achados e números que orientam a prescrição. */
  resumo: string;
};

export const ACERVO: Artigo[] = [];
