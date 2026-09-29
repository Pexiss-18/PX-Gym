import type {
  AuthGateway,
  ConnectivityStatus,
  PdfGateway,
  RelatorioParaPdf,
  Sessao,
  SignInOutcome,
  SignUpOutcome,
  SincronizacaoGateway,
  UsuarioAutenticado,
} from "@px/core";

/*
 * Stubs da fase "Domínio e Interface primeiro": respondem como o serviço de
 * verdade responderia, sem rede, banco nem hardware.
 */

export const SENHA_DEMO = "pxgym123";

export const USUARIOS_DEMO: Record<string, UsuarioAutenticado> = {
  "aluno@pxgym.dev": { id: "u-aluno", nome: "Paulo Rogério", email: "aluno@pxgym.dev", papel: "aluno" },
  "personal@pxgym.dev": { id: "u-personal", nome: "Carla Mendes", email: "personal@pxgym.dev", papel: "personal" },
  "coordenacao@pxgym.dev": {
    id: "u-coord",
    nome: "Coordenação Px GYM",
    email: "coordenacao@pxgym.dev",
    papel: "coordenacao",
  },
};

const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Stub de autenticação: três contas fixas (aluno, personal, coordenação),
 * todas com a senha de demonstração. Devolve sessões válidas sem Supabase.
 */
export class AuthGatewayStub implements AuthGateway {
  constructor(private readonly latenciaMs = 300) {}

  async signIn(email: string, password: string): Promise<SignInOutcome> {
    await espera(this.latenciaMs);
    const usuario = USUARIOS_DEMO[email];
    if (!usuario || password !== SENHA_DEMO) {
      return { ok: false, reason: "invalid-credentials" };
    }
    const sessao: Sessao = { usuario, token: `stub-${usuario.id}`, expiraEm: null };
    return { ok: true, sessao };
  }

  async signUp(email: string): Promise<SignUpOutcome> {
    await espera(this.latenciaMs);
    return USUARIOS_DEMO[email]
      ? { ok: false, reason: "email-taken" }
      : { ok: true, needsConfirmation: true };
  }

  async signOut(): Promise<void> {}
}

/** "Gera" o PDF: devolve um endereço em memória (expo-print entra na fase seguinte). */
export class PdfGatewaySimulado implements PdfGateway {
  constructor(private readonly latenciaMs = 600) {}

  async gerar(relatorio: RelatorioParaPdf): Promise<string> {
    await espera(this.latenciaMs);
    return `memoria://relatorios/${relatorio.cicloId}.pdf`;
  }
}

/** Backend de mentira: aceita tudo, com um atraso pra UI mostrar o "enviando". */
export class SincronizacaoGatewaySimulado implements SincronizacaoGateway {
  constructor(private readonly latenciaMs = 120) {}

  async enviar(): Promise<void> {
    await espera(this.latenciaMs);
  }
}

/** Conectividade fixa em "online" nesta fase. */
export const conectividadeSimulada: ConnectivityStatus = {
  isOnline: async () => true,
};
