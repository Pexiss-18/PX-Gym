import type { CicloAvaliacao } from "../entities/ciclo-avaliacao";
import type { Papel } from "../value-objects/sessao";
import { StatusCiclo } from "../value-objects/status";

/** Motivo curto demais não ajuda o aluno a corrigir nada. */
export const MINIMO_MOTIVO_DEVOLUCAO = 10;

export type VerificacaoDevolucao =
  | { permitido: true }
  | {
      permitido: false;
      motivo: "sem-permissao" | "status-invalido" | "motivo-curto";
      mensagem: string;
    };

/** Quem pode devolver, quando, e com que justificativa. */
export class RegraDevolucaoService {
  verificar(input: {
    ciclo: CicloAvaliacao;
    papel: Papel;
    motivo: string;
  }): VerificacaoDevolucao {
    if (input.papel !== "coordenacao") {
      return {
        permitido: false,
        motivo: "sem-permissao",
        mensagem: "Só a coordenação devolve relatórios.",
      };
    }
    if (input.ciclo.status !== StatusCiclo.AGUARDANDO_APROVACAO) {
      return {
        permitido: false,
        motivo: "status-invalido",
        mensagem: "Só dá pra devolver um relatório aguardando aprovação.",
      };
    }
    if (input.motivo.trim().length < MINIMO_MOTIVO_DEVOLUCAO) {
      return {
        permitido: false,
        motivo: "motivo-curto",
        mensagem: `Explique o motivo (mínimo ${MINIMO_MOTIVO_DEVOLUCAO} caracteres).`,
      };
    }
    return { permitido: true };
  }
}
