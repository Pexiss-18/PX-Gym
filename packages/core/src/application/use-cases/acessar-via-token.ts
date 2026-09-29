import type {
  AcompanhamentoRepository,
  Clock,
  SessionStorage,
  TokenPersonalRepository,
} from "../../domain/contracts";
import type { Sessao } from "../../domain/value-objects/sessao";

export type RecusaToken =
  | "token-invalido"
  | "token-expirado"
  | "token-revogado"
  | "acompanhamento-encerrado";

export type ResultadoAcessoToken =
  | { status: "autorizado"; sessao: Sessao }
  | { status: "recusado"; motivo: RecusaToken };

/**
 * O personal entra sem conta, com o código que o aluno gerou. A sessão
 * criada morre junto com o token (expiraEm = expiração do token).
 */
export class AcessarViaTokenUseCase {
  constructor(
    private readonly tokens: TokenPersonalRepository,
    private readonly acompanhamentos: AcompanhamentoRepository,
    private readonly sessoes: SessionStorage,
    private readonly clock: Clock,
  ) {}

  async execute(input: { token: string }): Promise<ResultadoAcessoToken> {
    const codigo = input.token.trim().toUpperCase();
    const token = codigo ? await this.tokens.porToken(codigo) : null;
    if (!token) return { status: "recusado", motivo: "token-invalido" };

    const agora = this.clock.now();
    const situacao = token.situacao(agora);
    if (situacao === "expirado") return { status: "recusado", motivo: "token-expirado" };
    if (situacao === "revogado") return { status: "recusado", motivo: "token-revogado" };

    const acompanhamento = await this.acompanhamentos.porId(token.acompanhamentoId);
    const hoje = agora.toISOString().slice(0, 10);
    if (!acompanhamento || !acompanhamento.estaAtivo(hoje)) {
      return { status: "recusado", motivo: "acompanhamento-encerrado" };
    }

    const sessao: Sessao = {
      usuario: {
        id: token.personalId,
        nome: token.personalNome,
        email: "",
        papel: "personal",
      },
      token: `token:${token.token}`,
      expiraEm: token.expiraEm,
    };
    await this.sessoes.salvar(sessao);
    return { status: "autorizado", sessao };
  }
}
