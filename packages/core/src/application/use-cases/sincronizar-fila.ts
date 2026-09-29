import type {
  CicloAvaliacaoRepository,
  ConnectivityStatus,
  SincronizacaoGateway,
} from "../../domain/contracts";
import {
  SincronizacaoService,
  type ResumoSincronizacao,
} from "../../domain/services/sincronizacao";
import { StatusSincronizacao } from "../../domain/value-objects/status";

export type ResultadoSincronizacao =
  | { status: "offline"; resumo: ResumoSincronizacao }
  | {
      status: "concluido";
      enviados: number;
      falhas: number;
      resumo: ResumoSincronizacao;
    };

/**
 * Esvazia a fila offline-first: manda cada item pendente (ou que falhou
 * antes) e grava o resultado no próprio item — synced sai da fila, error
 * volta na próxima rodada. Uma falha não interrompe as outras.
 */
export class SincronizarFilaUseCase {
  constructor(
    private readonly ciclos: CicloAvaliacaoRepository,
    private readonly gateway: SincronizacaoGateway,
    private readonly conectividade: ConnectivityStatus,
    private readonly servico = new SincronizacaoService(),
  ) {}

  async execute(): Promise<ResultadoSincronizacao> {
    const ciclos = await this.ciclos.listarTodos();
    if (!(await this.conectividade.isOnline())) {
      return { status: "offline", resumo: this.servico.resumir(ciclos) };
    }

    const porId = new Map(ciclos.map((c) => [c.id, c]));
    const alterados = new Set<string>();
    let enviados = 0;
    let falhas = 0;

    for (const item of this.servico.montarFila(ciclos)) {
      const ciclo = porId.get(item.cicloId)!;
      try {
        await this.gateway.enviar(item, ciclo);
        ciclo.marcarSincronizacao(item.chave, StatusSincronizacao.SYNCED);
        enviados++;
      } catch {
        ciclo.marcarSincronizacao(item.chave, StatusSincronizacao.ERROR);
        falhas++;
      }
      alterados.add(ciclo.id);
    }

    for (const id of alterados) await this.ciclos.salvar(porId.get(id)!);
    return {
      status: "concluido",
      enviados,
      falhas,
      resumo: this.servico.resumir(ciclos),
    };
  }
}
