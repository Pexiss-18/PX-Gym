import { Email } from "../../domain/value-objects/email";
import type { AuthFailure, AuthGateway } from "../../domain/contracts";

/** Mínimo do Supabase Auth por padrão — validar antes evita ida à rede à toa. */
export const MIN_PASSWORD_LENGTH = 6;

/** Motivo de recusa: regra local (sem rede) ou resposta do provedor. */
export type AuthRejection =
  | "invalid-email"
  | "missing-password"
  | "password-too-short"
  | "password-mismatch"
  | AuthFailure;

export type SignUpResult =
  | { status: "signed-up" }
  /** Conta criada, mas o provedor exige clicar no link enviado por e-mail. */
  | { status: "confirmation-sent" }
  | { status: "rejected"; reason: AuthRejection };

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
