import { Email } from "../value-objects/email";
import type { AuthFailure, AuthGateway } from "../ports";

/** Mínimo do Supabase Auth por padrão — validar antes evita ida à rede à toa. */
export const MIN_PASSWORD_LENGTH = 6;

/** Motivo de recusa: regra local (sem rede) ou resposta do provedor. */
export type AuthRejection =
  | "invalid-email"
  | "missing-password"
  | "password-too-short"
  | "password-mismatch"
  | AuthFailure;

export type SignInResult =
  | { status: "signed-in" }
  | { status: "rejected"; reason: AuthRejection };

export type SignUpResult =
  | { status: "signed-up" }
  /** Conta criada, mas o provedor exige clicar no link enviado por e-mail. */
  | { status: "confirmation-sent" }
  | { status: "rejected"; reason: AuthRejection };

/**
 * Login com e-mail e senha. As regras de formato ficam aqui (e não na tela)
 * pra que a recusa aconteça sem rede e seja testável.
 */
export class SignInUseCase {
  constructor(private readonly auth: AuthGateway) {}

  async execute(input: {
    email: string;
    password: string;
  }): Promise<SignInResult> {
    if (!Email.isValid(input.email)) {
      return { status: "rejected", reason: "invalid-email" };
    }
    if (input.password.length === 0) {
      return { status: "rejected", reason: "missing-password" };
    }

    const outcome = await this.auth.signIn(
      Email.parse(input.email).value,
      input.password,
    );
    return outcome.ok
      ? { status: "signed-in" }
      : { status: "rejected", reason: outcome.reason };
  }
}

/** Cadastro de conta nova com confirmação de senha. */
export class SignUpUseCase {
  constructor(private readonly auth: AuthGateway) {}

  async execute(input: {
    email: string;
    password: string;
    passwordConfirmation: string;
  }): Promise<SignUpResult> {
    if (!Email.isValid(input.email)) {
      return { status: "rejected", reason: "invalid-email" };
    }
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      return { status: "rejected", reason: "password-too-short" };
    }
    if (input.password !== input.passwordConfirmation) {
      return { status: "rejected", reason: "password-mismatch" };
    }

    const outcome = await this.auth.signUp(
      Email.parse(input.email).value,
      input.password,
    );
    if (!outcome.ok) return { status: "rejected", reason: outcome.reason };
    return outcome.needsConfirmation
      ? { status: "confirmation-sent" }
      : { status: "signed-up" };
  }
}
