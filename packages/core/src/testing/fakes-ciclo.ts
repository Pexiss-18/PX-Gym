import type {
  AcompanhamentoRepository,
  CameraGateway,
  CicloAvaliacaoRepository,
  FotoCapturada,
  PdfGateway,
  PermissaoCamera,
  RelatorioParaPdf,
  SessionStorage,
  SincronizacaoGateway,
  TokenPersonalRepository,
} from "../domain/contracts";
import { Acompanhamento } from "../domain/entities/acompanhamento";
import {
  CicloAvaliacao,
  type ItemSincronizavel,
} from "../domain/entities/ciclo-avaliacao";
import { TokenPersonal } from "../domain/entities/token-personal";
import type { Sessao } from "../domain/value-objects/sessao";

/*
 * Fakes em memória do relatório de ciclo. O repositório guarda PROPS num
 * Map (não a instância): cada porId() devolve um agregado novo, como um
 * banco de verdade faria — alterar o objeto sem salvar não "vaza" pro Map.
 */

export class CicloAvaliacaoRepositoryFake implements CicloAvaliacaoRepository {
  readonly dados = new Map<string, ReturnType<CicloAvaliacao["toProps"]>>();
  salvamentos = 0;

  constructor(ciclos: CicloAvaliacao[] = []) {
    for (const c of ciclos) this.dados.set(c.id, c.toProps());
  }

  async salvar(ciclo: CicloAvaliacao) {
    this.salvamentos++;
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

export class AcompanhamentoRepositoryFake implements AcompanhamentoRepository {
  readonly dados = new Map<string, ReturnType<Acompanhamento["toProps"]>>();

  constructor(acompanhamentos: Acompanhamento[] = []) {
    for (const a of acompanhamentos) this.dados.set(a.id, a.toProps());
  }

  async porId(id: string) {
    const props = this.dados.get(id);
    return props ? Acompanhamento.restaurar(props) : null;
  }
}

export class TokenPersonalRepositoryFake implements TokenPersonalRepository {
  readonly dados = new Map<string, ReturnType<TokenPersonal["toProps"]>>();

  constructor(tokens: TokenPersonal[] = []) {
    for (const t of tokens) this.dados.set(t.token, t.toProps());
  }

  async porToken(token: string) {
    const props = this.dados.get(token);
    return props ? TokenPersonal.restaurar(props) : null;
  }
  async salvar(token: TokenPersonal) {
    this.dados.set(token.token, token.toProps());
  }
}

/** Stub de sessão: guarda na memória o que o SecureStore guardaria. */
export class SessionStorageFake implements SessionStorage {
  sessao: Sessao | null;

  constructor(inicial: Sessao | null = null) {
    this.sessao = inicial;
  }

  async salvar(sessao: Sessao) {
    this.sessao = sessao;
  }
  async carregar() {
    return this.sessao;
  }
  async limpar() {
    this.sessao = null;
  }
}

export class PdfGatewayFake implements PdfGateway {
  gerados: RelatorioParaPdf[] = [];
  falharProximo = false;

  async gerar(relatorio: RelatorioParaPdf) {
    if (this.falharProximo) {
      this.falharProximo = false;
      throw new Error("sem espaço em disco");
    }
    this.gerados.push(relatorio);
    return `memoria://relatorios/${relatorio.cicloId}.pdf`;
  }
}

/** Backend falso: `falhar` com as chaves que devem dar erro no envio. */
export class SincronizacaoGatewayFake implements SincronizacaoGateway {
  enviados: ItemSincronizavel[] = [];
  falhar = new Set<string>();

  async enviar(item: ItemSincronizavel) {
    if (this.falhar.has(item.chave)) throw new Error("servidor recusou");
    this.enviados.push(item);
  }
}

export class CameraGatewayFake implements CameraGateway {
  capturas = 0;

  constructor(
    public atual: PermissaoCamera = "concedida",
    public aoSolicitar: PermissaoCamera = atual,
  ) {}

  async permissao() {
    return this.atual;
  }
  async solicitarPermissao() {
    this.atual = this.aoSolicitar;
    return this.atual;
  }
  async capturar(): Promise<FotoCapturada> {
    if (this.atual !== "concedida") throw new Error("câmera sem permissão");
    this.capturas++;
    return { uri: `file:///fake/foto-${this.capturas}.jpg`, largura: 1080, altura: 1440 };
  }
}
