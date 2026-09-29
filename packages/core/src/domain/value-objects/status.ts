/**
 * Enums do domínio no formato "objeto constante + tipo": o valor existe em
 * runtime (dá pra iterar e comparar) e o tipo é a união das strings.
 */

/** Onde um registro está em relação à nuvem. */
export const StatusSincronizacao = {
  PENDING: "pending",
  SYNCED: "synced",
  ERROR: "error",
} as const;
export type StatusSincronizacao =
  (typeof StatusSincronizacao)[keyof typeof StatusSincronizacao];

/**
 * Ciclo de vida de negócio do relatório do ciclo de treino (o "StatusPeriodo"
 * da especificação):
 *
 *   em_andamento ──(aluno e personal assinam)──▶ aguardando_aprovacao
 *   aguardando_aprovacao ──(coordenação aprova)──▶ aprovado
 *   aguardando_aprovacao ──(coordenação devolve)──▶ devolvido
 *   devolvido ──(corrige e assina de novo)──▶ aguardando_aprovacao
 */
export const StatusCiclo = {
  EM_ANDAMENTO: "em_andamento",
  AGUARDANDO_APROVACAO: "aguardando_aprovacao",
  APROVADO: "aprovado",
  DEVOLVIDO: "devolvido",
} as const;
export type StatusCiclo = (typeof StatusCiclo)[keyof typeof StatusCiclo];

export const ROTULO_STATUS_CICLO: Record<StatusCiclo, string> = {
  em_andamento: "Em andamento",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  devolvido: "Devolvido",
};
