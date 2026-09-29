import { BusinessRuleError, InvalidValueError } from "../errors";

export type SituacaoToken = "valido" | "expirado" | "revogado";

export type TokenPersonalProps = {
  token: string;
  acompanhamentoId: string;
  personalId: string;
  personalNome: string;
  emitidoEm: Date;
  expiraEm: Date;
  revogadoEm: Date | null;
};

const HORA_MS = 60 * 60 * 1000;
/** 30 dias: dá pra cobrir um ciclo inteiro sem virar credencial eterna. */
export const VALIDADE_MAXIMA_HORAS = 24 * 30;
const TOKEN_MINIMO = 8;

/**
 * Acesso do personal sem conta no app (o "TokenSupervisor" da
 * especificação): o aluno gera um código, o personal entra com ele. Expira
 * sozinho e pode ser revogado antes disso.
 */
export class TokenPersonal {
  private constructor(private props: TokenPersonalProps) {}

  static emitir(input: {
    token: string;
    acompanhamentoId: string;
    personalId: string;
    personalNome: string;
    agora: Date;
    validadeHoras: number;
  }): TokenPersonal {
    if (input.token.trim().length < TOKEN_MINIMO) {
      throw new InvalidValueError(`Token precisa de ${TOKEN_MINIMO}+ caracteres.`);
    }
    if (
      !Number.isFinite(input.validadeHoras) ||
      input.validadeHoras <= 0 ||
      input.validadeHoras > VALIDADE_MAXIMA_HORAS
    ) {
      throw new InvalidValueError(
        `Validade entre 1h e ${VALIDADE_MAXIMA_HORAS}h: ${input.validadeHoras}`,
      );
    }
    return new TokenPersonal({
      token: input.token.trim().toUpperCase(),
      acompanhamentoId: input.acompanhamentoId,
      personalId: input.personalId,
      personalNome: input.personalNome,
      emitidoEm: new Date(input.agora.getTime()),
      expiraEm: new Date(input.agora.getTime() + input.validadeHoras * HORA_MS),
      revogadoEm: null,
    });
  }

  static restaurar(props: TokenPersonalProps): TokenPersonal {
    return new TokenPersonal({ ...props });
  }

  get token() { return this.props.token; }
  get acompanhamentoId() { return this.props.acompanhamentoId; }
  get personalId() { return this.props.personalId; }
  get personalNome() { return this.props.personalNome; }
  get expiraEm() { return this.props.expiraEm; }
  get revogadoEm() { return this.props.revogadoEm; }

  /** Revogação vence expiração: um token revogado nunca volta a ser válido. */
  situacao(agora: Date): SituacaoToken {
    if (this.props.revogadoEm !== null) return "revogado";
    if (agora.getTime() >= this.props.expiraEm.getTime()) return "expirado";
    return "valido";
  }

  revogar(agora: Date): void {
    if (this.props.revogadoEm !== null) {
      throw new BusinessRuleError("Token já revogado.");
    }
    this.props = { ...this.props, revogadoEm: new Date(agora.getTime()) };
  }

  toProps(): TokenPersonalProps {
    return { ...this.props };
  }
}
