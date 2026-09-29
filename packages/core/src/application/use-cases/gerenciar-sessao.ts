import type { AuthGateway, Clock, SessionStorage } from "../../domain/contracts";
import { sessaoValida, type Sessao } from "../../domain/value-objects/sessao";

/**
 * Abertura do app: devolve a sessão guardada se ainda valer. Sessão
 * vencida é apagada — não adianta entrar com ela.
 */
export class RestaurarSessaoUseCase {
  constructor(
    private readonly sessoes: SessionStorage,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<Sessao | null> {
    const sessao = await this.sessoes.carregar();
    if (!sessao) return null;
    if (sessaoValida(sessao, this.clock.now())) return sessao;
    await this.sessoes.limpar();
    return null;
  }
}

/** Sair: encerra no provedor e apaga do aparelho, mesmo sem rede. */
export class EncerrarSessaoUseCase {
  constructor(
    private readonly auth: AuthGateway,
    private readonly sessoes: SessionStorage,
  ) {}

  async execute(): Promise<void> {
    try {
      await this.auth.signOut();
    } finally {
      await this.sessoes.limpar();
    }
  }
}
