import { InvalidValueError } from "../errors";

// Checagem de formato, não de existência: quem confirma o e-mail é o Supabase Auth.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E-mail da conta, normalizado (sem espaços nas pontas, minúsculo). */
export class Email {
  private constructor(readonly value: string) {}

  static parse(raw: string): Email {
    const value = raw.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(value)) {
      throw new InvalidValueError(`E-mail inválido: ${raw}`);
    }
    return new Email(value);
  }

  static isValid(raw: string): boolean {
    return EMAIL_PATTERN.test(raw.trim().toLowerCase());
  }
}
