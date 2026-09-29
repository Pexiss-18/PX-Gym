import {
  Acompanhamento,
  CicloAvaliacao,
  TokenPersonal,
  type AcompanhamentoProps,
  type AcompanhamentoRepository,
  type CicloAvaliacaoProps,
  type CicloAvaliacaoRepository,
  type TokenPersonalProps,
  type TokenPersonalRepository,
} from "@px/core";

/*
 * Repositórios desta fase: um Map em memória no lugar do banco. Guardam
 * PROPS, não instâncias — cada leitura reidrata um agregado novo, igual um
 * banco faria. Fechou o app, perdeu (de propósito: sem persistência real
 * até a fase do SQLite/Supabase). Trocar por banco = outra classe com a
 * mesma interface; nenhum use case muda.
 */

export class CicloAvaliacaoRepositoryMemoria implements CicloAvaliacaoRepository {
  private readonly dados = new Map<string, CicloAvaliacaoProps>();

  constructor(iniciais: CicloAvaliacao[] = []) {
    for (const c of iniciais) this.dados.set(c.id, c.toProps());
  }

  async salvar(ciclo: CicloAvaliacao) {
    this.dados.set(ciclo.id, ciclo.toProps());
  }
  async porId(id: string) {
    const props = this.dados.get(id);
    return props ? CicloAvaliacao.restaurar(props) : null;
  }
  async listarPorAluno(alunoId: string) {
    return (await this.listarTodos()).filter((c) => c.alunoId === alunoId);
  }
  async listarPorPersonal(personalId: string) {
    return (await this.listarTodos()).filter((c) => c.personalId === personalId);
  }
  async listarTodos() {
    return [...this.dados.values()].map((p) => CicloAvaliacao.restaurar(p));
  }
}

export class AcompanhamentoRepositoryMemoria implements AcompanhamentoRepository {
  private readonly dados = new Map<string, AcompanhamentoProps>();

  constructor(iniciais: Acompanhamento[] = []) {
    for (const a of iniciais) this.dados.set(a.id, a.toProps());
  }

  async porId(id: string) {
    const props = this.dados.get(id);
    return props ? Acompanhamento.restaurar(props) : null;
  }
}

export class TokenPersonalRepositoryMemoria implements TokenPersonalRepository {
  private readonly dados = new Map<string, TokenPersonalProps>();

  constructor(iniciais: TokenPersonal[] = []) {
    for (const t of iniciais) this.dados.set(t.token, t.toProps());
  }

  async porToken(token: string) {
    const props = this.dados.get(token);
    return props ? TokenPersonal.restaurar(props) : null;
  }
  async salvar(token: TokenPersonal) {
    this.dados.set(token.token, token.toProps());
  }
}
