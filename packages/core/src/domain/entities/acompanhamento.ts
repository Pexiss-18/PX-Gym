import { BusinessRuleError, InvalidValueError } from "../errors";

export type AcompanhamentoProps = {
  id: string;
  alunoId: string;
  alunoNome: string;
  personalId: string;
  personalNome: string;
  academia: string;
  /** AAAA-MM-DD */
  inicio: string;
  /** AAAA-MM-DD */
  fim: string;
  encerradoEm: string | null;
};

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * O vínculo aluno ↔ personal numa academia (o "Estágio" da especificação):
 * tem raiz e ciclo de vida próprios, e dentro dele correm os ciclos de
 * avaliação. Encerrado, não abre ciclo novo.
 */
export class Acompanhamento {
  private constructor(private props: AcompanhamentoProps) {}

  static iniciar(props: Omit<AcompanhamentoProps, "encerradoEm">): Acompanhamento {
    if (!DATA.test(props.inicio) || !DATA.test(props.fim)) {
      throw new InvalidValueError("Datas do acompanhamento em AAAA-MM-DD.");
    }
    if (props.fim <= props.inicio) {
      throw new InvalidValueError("O acompanhamento termina antes de começar.");
    }
    if (props.alunoId === props.personalId) {
      throw new InvalidValueError("Aluno e personal precisam ser pessoas diferentes.");
    }
    return new Acompanhamento({ ...props, encerradoEm: null });
  }

  static restaurar(props: AcompanhamentoProps): Acompanhamento {
    return new Acompanhamento({ ...props });
  }

  get id() { return this.props.id; }
  get alunoId() { return this.props.alunoId; }
  get alunoNome() { return this.props.alunoNome; }
  get personalId() { return this.props.personalId; }
  get personalNome() { return this.props.personalNome; }
  get academia() { return this.props.academia; }
  get inicio() { return this.props.inicio; }
  get fim() { return this.props.fim; }
  get encerradoEm() { return this.props.encerradoEm; }

  /** Ativo = dentro das datas e não encerrado antes da hora. */
  estaAtivo(hoje: string): boolean {
    if (this.props.encerradoEm !== null) return false;
    return hoje >= this.props.inicio && hoje <= this.props.fim;
  }

  participa(usuarioId: string): boolean {
    return usuarioId === this.props.alunoId || usuarioId === this.props.personalId;
  }

  encerrar(hoje: string): void {
    if (this.props.encerradoEm !== null) {
      throw new BusinessRuleError("Acompanhamento já encerrado.");
    }
    this.props = { ...this.props, encerradoEm: hoje };
  }

  toProps(): AcompanhamentoProps {
    return { ...this.props };
  }
}
