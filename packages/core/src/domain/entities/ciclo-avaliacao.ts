import { BusinessRuleError, InvalidValueError } from "../errors";
import type { Assinatura } from "../value-objects/assinatura";
import { CargaHoraria } from "../value-objects/carga-horaria";
import type { Coordenada } from "../value-objects/coordenada";
import { mediaDosCriterios, type Criterio } from "../value-objects/criterio";
import { StatusCiclo, StatusSincronizacao } from "../value-objects/status";

/** Quem assina o relatório do ciclo. */
export type Signatario = "aluno" | "personal";
export const SIGNATARIOS: readonly Signatario[] = ["aluno", "personal"];

/** Um treino feito dentro do ciclo (a "Atividade Desenvolvida"). */
export type AtividadeDesenvolvida = {
  readonly id: string;
  /** AAAA-MM-DD */
  readonly data: string;
  readonly descricao: string;
  readonly horas: number;
  /** Check-in na academia, quando o aluno marcou o GPS. */
  readonly local: Coordenada | null;
  readonly statusSincronizacao: StatusSincronizacao;
};

export type Avaliacao = {
  readonly criterios: readonly Criterio[];
  readonly comentario: string;
  readonly registradaEm: Date;
  readonly statusSincronizacao: StatusSincronizacao;
};

export type RegistroAssinatura = {
  readonly signatario: Signatario;
  readonly assinatura: Assinatura;
  readonly statusSincronizacao: StatusSincronizacao;
};

export type Devolucao = {
  readonly motivo: string;
  readonly em: Date;
};

export type CicloAvaliacaoProps = {
  id: string;
  acompanhamentoId: string;
  alunoId: string;
  personalId: string;
  titulo: string;
  /** AAAA-MM-DD */
  inicio: string;
  /** AAAA-MM-DD */
  fim: string;
  horasMinimas: number;
  horasPeriodo: number;
  status: StatusCiclo;
  atividades: AtividadeDesenvolvida[];
  avaliacaoPersonal: Avaliacao | null;
  autoAvaliacao: Avaliacao | null;
  assinaturas: RegistroAssinatura[];
  devolucoes: Devolucao[];
  aprovadoEm: Date | null;
};

/** Tudo que precisa subir pra nuvem, com a chave estável de cada item. */
export type ItemSincronizavel = {
  readonly cicloId: string;
  /** id da atividade, "avaliacao:personal", "avaliacao:aluno", "assinatura:aluno"… */
  readonly chave: string;
  readonly tipo: "atividade" | "avaliacao" | "assinatura";
  readonly status: StatusSincronizacao;
};

/** Um treino não conta mais que isso — protege contra "10h" digitado errado. */
export const MAX_HORAS_POR_TREINO = 4;
const MAX_COMENTARIO = 500;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Aggregate Root do relatório de um ciclo de treino (o "PeriodoAvaliacao" da
 * especificação). Toda mudança em atividades, avaliações e assinaturas passa
 * por aqui — é o único lugar que conhece as invariantes:
 *
 * - relatório assinado ou aprovado não aceita atividade nem avaliação nova;
 * - só assina quem cumpriu as horas mínimas e tem as duas avaliações;
 * - com as duas assinaturas o ciclo vai sozinho pra aprovação;
 * - devolver apaga as assinaturas (o conteúdo vai mudar, a assinatura não vale);
 * - PDF só sai aprovado e com as assinaturas já sincronizadas.
 */
export class CicloAvaliacao {
  private constructor(private props: CicloAvaliacaoProps) {}

  static abrir(input: {
    id: string;
    acompanhamentoId: string;
    alunoId: string;
    personalId: string;
    titulo: string;
    inicio: string;
    fim: string;
    horasMinimas: number;
    horasPeriodo: number;
  }): CicloAvaliacao {
    if (input.titulo.trim().length === 0) {
      throw new InvalidValueError("O ciclo precisa de um título.");
    }
    if (!DATA.test(input.inicio) || !DATA.test(input.fim)) {
      throw new InvalidValueError("Datas do ciclo em AAAA-MM-DD.");
    }
    if (input.fim < input.inicio) {
      throw new InvalidValueError("O ciclo termina antes de começar.");
    }
    // Valida mínimo × período já na abertura.
    CargaHoraria.criar({
      totais: 0,
      minimas: input.horasMinimas,
      periodo: input.horasPeriodo,
    });
    return new CicloAvaliacao({
      ...input,
      titulo: input.titulo.trim(),
      status: StatusCiclo.EM_ANDAMENTO,
      atividades: [],
      avaliacaoPersonal: null,
      autoAvaliacao: null,
      assinaturas: [],
      devolucoes: [],
      aprovadoEm: null,
    });
  }

  /** Reidrata do repositório, sem revalidar (o estado já foi validado). */
  static restaurar(props: CicloAvaliacaoProps): CicloAvaliacao {
    return new CicloAvaliacao(clonar(props));
  }

  get id() { return this.props.id; }
  get acompanhamentoId() { return this.props.acompanhamentoId; }
  get alunoId() { return this.props.alunoId; }
  get personalId() { return this.props.personalId; }
  get titulo() { return this.props.titulo; }
  get inicio() { return this.props.inicio; }
  get fim() { return this.props.fim; }
  get status() { return this.props.status; }
  get atividades(): readonly AtividadeDesenvolvida[] { return this.props.atividades; }
  get avaliacaoPersonal() { return this.props.avaliacaoPersonal; }
  get autoAvaliacao() { return this.props.autoAvaliacao; }
  get assinaturas(): readonly RegistroAssinatura[] { return this.props.assinaturas; }
  get devolucoes(): readonly Devolucao[] { return this.props.devolucoes; }
  get aprovadoEm() { return this.props.aprovadoEm; }

  get cargaHoraria(): CargaHoraria {
    return CargaHoraria.criar({
      totais: this.props.atividades.reduce((acc, a) => acc + a.horas, 0),
      minimas: this.props.horasMinimas,
      periodo: this.props.horasPeriodo,
    });
  }

  get mediaPersonal(): number | null {
    const a = this.props.avaliacaoPersonal;
    return a ? mediaDosCriterios(a.criterios) : null;
  }

  get mediaAutoAvaliacao(): number | null {
    const a = this.props.autoAvaliacao;
    return a ? mediaDosCriterios(a.criterios) : null;
  }

  /** Dá pra mexer no conteúdo? Só antes de qualquer assinatura. */
  get editavel(): boolean {
    return (
      (this.props.status === StatusCiclo.EM_ANDAMENTO ||
        this.props.status === StatusCiclo.DEVOLVIDO) &&
      this.props.assinaturas.length === 0
    );
  }

  assinou(signatario: Signatario): boolean {
    return this.props.assinaturas.some((a) => a.signatario === signatario);
  }

  registrarAtividade(input: {
    id: string;
    data: string;
    descricao: string;
    horas: number;
    local: Coordenada | null;
  }): void {
    this.exigirEditavel("registrar atividades");
    const descricao = input.descricao.trim();
    if (!DATA.test(input.data)) {
      throw new InvalidValueError(`Data inválida: ${input.data}`);
    }
    if (input.data < this.props.inicio || input.data > this.props.fim) {
      throw new BusinessRuleError(
        `O treino de ${input.data} está fora do ciclo (${this.props.inicio} a ${this.props.fim}).`,
      );
    }
    if (descricao.length < 3) {
      throw new InvalidValueError("Descreva o treino (mínimo 3 letras).");
    }
    if (!Number.isFinite(input.horas) || input.horas <= 0 || input.horas > MAX_HORAS_POR_TREINO) {
      throw new InvalidValueError(
        `Um treino dura entre 0 e ${MAX_HORAS_POR_TREINO}h: ${input.horas}`,
      );
    }
    if (this.props.atividades.some((a) => a.id === input.id)) {
      throw new BusinessRuleError(`Atividade ${input.id} já registrada.`);
    }
    // Lança se passar do teto do período.
    this.cargaHoraria.adicionar(input.horas);

    this.props.atividades = [
      ...this.props.atividades,
      {
        id: input.id,
        data: input.data,
        descricao,
        horas: input.horas,
        local: input.local,
        statusSincronizacao: StatusSincronizacao.PENDING,
      },
    ];
  }

  registrarAvaliacaoPersonal(input: {
    criterios: readonly Criterio[];
    comentario: string;
    agora: Date;
  }): void {
    this.props.avaliacaoPersonal = this.novaAvaliacao(input);
  }

  registrarAutoAvaliacao(input: {
    criterios: readonly Criterio[];
    comentario: string;
    agora: Date;
  }): void {
    this.props.autoAvaliacao = this.novaAvaliacao(input);
  }

  /** O que ainda impede a assinatura (vazio = pode assinar). */
  pendenciasParaAssinar(): string[] {
    const pendencias: string[] = [];
    const carga = this.cargaHoraria;
    if (!carga.cumpriuMinimo) {
      pendencias.push(`Faltam ${carga.faltam}h de treino pro mínimo do ciclo.`);
    }
    if (!this.props.avaliacaoPersonal) {
      pendencias.push("O personal ainda não avaliou o ciclo.");
    }
    if (!this.props.autoAvaliacao) {
      pendencias.push("O aluno ainda não fez a autoavaliação.");
    }
    return pendencias;
  }

  assinar(signatario: Signatario, assinatura: Assinatura): void {
    if (
      this.props.status !== StatusCiclo.EM_ANDAMENTO &&
      this.props.status !== StatusCiclo.DEVOLVIDO
    ) {
      throw new BusinessRuleError("Este relatório não está aberto para assinatura.");
    }
    if (this.assinou(signatario)) {
      throw new BusinessRuleError(`O ${signatario} já assinou este relatório.`);
    }
    const pendencias = this.pendenciasParaAssinar();
    if (pendencias.length > 0) {
      throw new BusinessRuleError(pendencias.join(" "));
    }

    this.props.assinaturas = [
      ...this.props.assinaturas,
      { signatario, assinatura, statusSincronizacao: StatusSincronizacao.PENDING },
    ];
    if (SIGNATARIOS.every((s) => this.assinou(s))) {
      this.props.status = StatusCiclo.AGUARDANDO_APROVACAO;
    }
  }

  aprovar(agora: Date): void {
    if (this.props.status !== StatusCiclo.AGUARDANDO_APROVACAO) {
      throw new BusinessRuleError("Só é possível aprovar um relatório aguardando aprovação.");
    }
    this.props.status = StatusCiclo.APROVADO;
    this.props.aprovadoEm = new Date(agora.getTime());
  }

  devolver(motivo: string, agora: Date): void {
    if (this.props.status !== StatusCiclo.AGUARDANDO_APROVACAO) {
      throw new BusinessRuleError("Só é possível devolver um relatório aguardando aprovação.");
    }
    if (motivo.trim().length === 0) {
      throw new InvalidValueError("Diga o motivo da devolução.");
    }
    this.props.status = StatusCiclo.DEVOLVIDO;
    this.props.assinaturas = [];
    this.props.devolucoes = [
      ...this.props.devolucoes,
      { motivo: motivo.trim(), em: new Date(agora.getTime()) },
    ];
  }

  /** Aprovado, com as duas assinaturas, e as duas já na nuvem. */
  podeGerarPdf(): boolean {
    return (
      this.props.status === StatusCiclo.APROVADO &&
      SIGNATARIOS.every((s) => this.assinou(s)) &&
      this.props.assinaturas.every(
        (a) => a.statusSincronizacao === StatusSincronizacao.SYNCED,
      )
    );
  }

  itensSincronizaveis(): ItemSincronizavel[] {
    const itens: ItemSincronizavel[] = this.props.atividades.map((a) => ({
      cicloId: this.props.id,
      chave: a.id,
      tipo: "atividade",
      status: a.statusSincronizacao,
    }));
    if (this.props.avaliacaoPersonal) {
      itens.push({
        cicloId: this.props.id,
        chave: "avaliacao:personal",
        tipo: "avaliacao",
        status: this.props.avaliacaoPersonal.statusSincronizacao,
      });
    }
    if (this.props.autoAvaliacao) {
      itens.push({
        cicloId: this.props.id,
        chave: "avaliacao:aluno",
        tipo: "avaliacao",
        status: this.props.autoAvaliacao.statusSincronizacao,
      });
    }
    for (const a of this.props.assinaturas) {
      itens.push({
        cicloId: this.props.id,
        chave: `assinatura:${a.signatario}`,
        tipo: "assinatura",
        status: a.statusSincronizacao,
      });
    }
    return itens;
  }

  /** Resultado do envio de um item: synced ou error (error volta pra fila). */
  marcarSincronizacao(
    chave: string,
    status: typeof StatusSincronizacao.SYNCED | typeof StatusSincronizacao.ERROR,
  ): void {
    if (chave === "avaliacao:personal" && this.props.avaliacaoPersonal) {
      this.props.avaliacaoPersonal = { ...this.props.avaliacaoPersonal, statusSincronizacao: status };
      return;
    }
    if (chave === "avaliacao:aluno" && this.props.autoAvaliacao) {
      this.props.autoAvaliacao = { ...this.props.autoAvaliacao, statusSincronizacao: status };
      return;
    }
    if (chave.startsWith("assinatura:")) {
      const signatario = chave.slice("assinatura:".length);
      if (this.props.assinaturas.some((a) => a.signatario === signatario)) {
        this.props.assinaturas = this.props.assinaturas.map((a) =>
          a.signatario === signatario ? { ...a, statusSincronizacao: status } : a,
        );
        return;
      }
    }
    if (this.props.atividades.some((a) => a.id === chave)) {
      this.props.atividades = this.props.atividades.map((a) =>
        a.id === chave ? { ...a, statusSincronizacao: status } : a,
      );
      return;
    }
    throw new BusinessRuleError(`Item ${chave} não existe neste ciclo.`);
  }

  toProps(): CicloAvaliacaoProps {
    return clonar(this.props);
  }

  private novaAvaliacao(input: {
    criterios: readonly Criterio[];
    comentario: string;
    agora: Date;
  }): Avaliacao {
    if (this.props.status === StatusCiclo.APROVADO) {
      throw new BusinessRuleError("Ciclo aprovado: não aceita uma segunda avaliação.");
    }
    this.exigirEditavel("mudar a avaliação");
    if (input.criterios.length === 0) {
      throw new InvalidValueError("Avalie pelo menos um critério.");
    }
    const nomes = new Set(input.criterios.map((c) => c.nome.toLowerCase()));
    if (nomes.size !== input.criterios.length) {
      throw new InvalidValueError("Critério repetido na avaliação.");
    }
    const comentario = input.comentario.trim();
    if (comentario.length > MAX_COMENTARIO) {
      throw new InvalidValueError(`Comentário passa de ${MAX_COMENTARIO} caracteres.`);
    }
    return {
      criterios: [...input.criterios],
      comentario,
      registradaEm: new Date(input.agora.getTime()),
      statusSincronizacao: StatusSincronizacao.PENDING,
    };
  }

  private exigirEditavel(acao: string): void {
    if (this.editavel) return;
    if (this.props.status === StatusCiclo.APROVADO) {
      throw new BusinessRuleError(`Ciclo aprovado: não dá mais pra ${acao}.`);
    }
    throw new BusinessRuleError(
      `Relatório já assinado: não dá mais pra ${acao} (peça a devolução).`,
    );
  }
}

function clonar(props: CicloAvaliacaoProps): CicloAvaliacaoProps {
  return {
    ...props,
    atividades: [...props.atividades],
    assinaturas: [...props.assinaturas],
    devolucoes: [...props.devolucoes],
  };
}
