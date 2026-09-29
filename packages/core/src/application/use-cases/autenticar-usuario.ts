import type { AuthGateway, SessionStorage } from "../../domain/contracts";
import { Email } from "../../domain/value-objects/email";
import type { Sessao } from "../../domain/value-objects/sessao";
import type { AuthRejection } from "./auth";

export type ResultadoAutenticacao =
  | { status: "autenticado"; sessao: Sessao }
  | { status: "recusado"; motivo: AuthRejection };

/**
 * Login com e-mail e senha. Formato validado aqui (recusa sem rede e
 * testável); credencial conferida pelo AuthGateway; sessão guardada no
 * SessionStorage pra sobreviver ao app fechado.
 */
export class AutenticarUsuarioUseCase {
  constructor(
    private readonly auth: AuthGateway,
    private readonly sessoes: SessionStorage,
  ) {}

  async execute(input: { email: string; senha: string }): Promise<ResultadoAutenticacao> {
    if (!Email.isValid(input.email)) {
      return { status: "recusado", motivo: "invalid-email" };
    }
    if (input.senha.length === 0) {
      return { status: "recusado", motivo: "missing-password" };
    }

    const resposta = await this.auth.signIn(Email.parse(input.email).value, input.senha);
    if (!resposta.ok) return { status: "recusado", motivo: resposta.reason };

    await this.sessoes.salvar(resposta.sessao);
    return { status: "autenticado", sessao: resposta.sessao };
  }
}
