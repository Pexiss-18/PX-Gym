import type { CicloAvaliacao } from "../entities/ciclo-avaliacao";
import { SIGNATARIOS } from "../entities/ciclo-avaliacao";
import { StatusCiclo, StatusSincronizacao } from "../value-objects/status";

/*
 * Serviço de domínio: responde uma pergunta sobre o ciclo sem mudar estado
 * e sem I/O — e explica o "não", pra tela mostrar o que falta.
 */

export type VerificacaoPdf =
  | { permitido: true }
  | { permitido: false; pendencias: string[] };

/** Pode gerar o PDF do relatório? Se não, por quê. */
export class RegraGeracaoPdfService {
  verificar(ciclo: CicloAvaliacao): VerificacaoPdf {
    if (ciclo.podeGerarPdf()) return { permitido: true };

    const pendencias: string[] = [];
    if (ciclo.status !== StatusCiclo.APROVADO) {
      pendencias.push("O relatório ainda não foi aprovado pela coordenação.");
    }
    for (const s of SIGNATARIOS) {
      const registro = ciclo.assinaturas.find((a) => a.signatario === s);
      if (!registro) {
        pendencias.push(`Falta a assinatura do ${s}.`);
      } else if (registro.statusSincronizacao !== StatusSincronizacao.SYNCED) {
        pendencias.push(`A assinatura do ${s} ainda não chegou na nuvem.`);
      }
    }
    return { permitido: false, pendencias };
  }
}
