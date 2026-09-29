import type { CicloAvaliacao, ItemSincronizavel } from "../entities/ciclo-avaliacao";
import { StatusSincronizacao } from "../value-objects/status";

export type ResumoSincronizacao = {
  pendentes: number;
  comErro: number;
  sincronizados: number;
};

/** Ordem de envio: assinatura primeiro (destrava o PDF), atividade por último. */
const PRIORIDADE: Record<ItemSincronizavel["tipo"], number> = {
  assinatura: 0,
  avaliacao: 1,
  atividade: 2,
};

/** Monta e resume a fila offline-first dos ciclos. */
export class SincronizacaoService {
  /**
   * O que precisa subir: pending e error (erro volta pra fila). Dentro de
   * cada tipo, error vai antes — é o que espera há mais tempo.
   */
  montarFila(ciclos: readonly CicloAvaliacao[]): ItemSincronizavel[] {
    return ciclos
      .flatMap((c) => c.itensSincronizaveis())
      .filter((i) => i.status !== StatusSincronizacao.SYNCED)
      .sort(
        (a, b) =>
          PRIORIDADE[a.tipo] - PRIORIDADE[b.tipo] ||
          Number(b.status === StatusSincronizacao.ERROR) -
            Number(a.status === StatusSincronizacao.ERROR),
      );
  }

  resumir(ciclos: readonly CicloAvaliacao[]): ResumoSincronizacao {
    const resumo: ResumoSincronizacao = { pendentes: 0, comErro: 0, sincronizados: 0 };
    for (const item of ciclos.flatMap((c) => c.itensSincronizaveis())) {
      if (item.status === StatusSincronizacao.PENDING) resumo.pendentes++;
      else if (item.status === StatusSincronizacao.ERROR) resumo.comErro++;
      else resumo.sincronizados++;
    }
    return resumo;
  }
}
