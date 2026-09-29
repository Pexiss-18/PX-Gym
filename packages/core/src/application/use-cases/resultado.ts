import { BusinessRuleError, InvalidValueError } from "../../domain/errors";

/**
 * Como um use case responde: sucesso com valor, ou falha com um tipo que a
 * tela sabe tratar. Erro de domínio vira falha; nada de exceção vazando pra UI.
 */
export type TipoErro =
  | "nao-encontrado"
  | "sem-permissao"
  | "regra-de-negocio"
  | "dados-invalidos"
  | "falha-externa";

export type ErroCasoDeUso = { tipo: TipoErro; mensagem: string };

export type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; erro: ErroCasoDeUso };

export function sucesso<T>(valor: T): Resultado<T> {
  return { ok: true, valor };
}

export function falha<T = never>(tipo: TipoErro, mensagem: string): Resultado<T> {
  return { ok: false, erro: { tipo, mensagem } };
}

/** Converte o que o domínio lançou em falha tipada. */
export function falhaDoErro<T = never>(erro: unknown): Resultado<T> {
  if (erro instanceof InvalidValueError) return falha("dados-invalidos", erro.message);
  if (erro instanceof BusinessRuleError) return falha("regra-de-negocio", erro.message);
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return falha("falha-externa", mensagem);
}
