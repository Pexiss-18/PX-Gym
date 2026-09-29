import {
  isAuthError,
  isAuthRetryableFetchError,
} from "@supabase/supabase-js";
import type {
  AuthFailure,
  AuthGateway,
  Papel,
  Sessao,
  SignInOutcome,
  SignUpOutcome,
} from "@px/core";
import type { PxSupabaseClient } from "./client";

/** Traduz o erro do Supabase Auth pra linguagem do domínio. */
export function toAuthFailure(error: unknown): AuthFailure {
  // Sem rede / DNS / servidor pausado: o supabase-js embrulha o fetch nisso.
  if (isAuthRetryableFetchError(error)) return "network";
  if (!isAuthError(error)) return "unknown";

  switch (error.code) {
    case "invalid_credentials":
      return "invalid-credentials";
    case "email_not_confirmed":
      return "email-not-confirmed";
    case "user_already_exists":
    case "email_exists":
      return "email-taken";
    case "weak_password":
      return "weak-password";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "rate-limited";
  }
  // Servidores antigos respondem login errado com 400 e sem code.
  if (error.status === 400) return "invalid-credentials";
  return "unknown";
}

/** Implementação Supabase Auth do AuthGateway (e-mail e senha). */
export class SupabaseAuthGateway implements AuthGateway {
  constructor(private readonly client: PxSupabaseClient) {}

  async signIn(email: string, password: string): Promise<SignInOutcome> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { ok: false, reason: toAuthFailure(error) };
    return { ok: true, sessao: paraSessao(data.session) };
  }

  async signUp(email: string, password: string): Promise<SignUpOutcome> {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) return { ok: false, reason: toAuthFailure(error) };
    // Com confirmação de e-mail ligada no projeto, a conta nasce sem sessão.
    return { ok: true, needsConfirmation: data.session === null };
  }

  async signOut(): Promise<void> {
    // O supabase-js remove a sessão local mesmo quando a revogação remota
    // falha (sem rede), então o erro aqui não impede a saída.
    await this.client.auth.signOut();
  }
}

const PAPEIS: readonly Papel[] = ["aluno", "personal", "coordenacao"];

type SessaoSupabase = {
  access_token: string;
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> };
};

/**
 * Traduz a sessão do Supabase pro domínio. O papel vem do user_metadata
 * (quem não tem é aluno). Sem expiração local: o supabase-js renova o token.
 */
export function paraSessao(sessao: SessaoSupabase): Sessao {
  const meta = sessao.user.user_metadata ?? {};
  const email = sessao.user.email ?? "";
  const papel = PAPEIS.includes(meta.papel as Papel) ? (meta.papel as Papel) : "aluno";
  const nomeMeta = typeof meta.name === "string" ? meta.name.trim() : "";
  const prefixo = email.split("@")[0] ?? "";
  const nome = nomeMeta || prefixo.charAt(0).toUpperCase() + prefixo.slice(1) || "Atleta";
  return {
    usuario: { id: sessao.user.id, nome, email, papel },
    token: sessao.access_token,
    expiraEm: null,
  };
}
