import { CicloAvaliacao, MAX_HORAS_POR_TREINO } from "../entities/ciclo-avaliacao";
import { Assinatura } from "../value-objects/assinatura";
import { Coordenada } from "../value-objects/coordenada";
import { Criterio } from "../value-objects/criterio";
import { StatusCiclo, StatusSincronizacao } from "../value-objects/status";
import { BusinessRuleError, InvalidValueError } from "../errors";
import {
  AGORA,
  ASSINATURA_B64,
  cicloAguardandoAprovacao,
  cicloAprovado,
  cicloNovo,
  cicloProntoParaAssinar,
} from "../../testing/cenario-ciclo";

const assinatura = () => Assinatura.criar(ASSINATURA_B64, AGORA);
const treino = (over: Partial<Parameters<CicloAvaliacao["registrarAtividade"]>[0]> = {}) => ({
  id: "t-1",
  data: "2026-09-05",
  descricao: "Treino A — peito e tríceps",
  horas: 1.5,
  local: null,
  ...over,
});

describe("CicloAvaliacao — abertura", () => {
  it("nasce em andamento, vazio e editável", () => {
    const c = cicloNovo();
    expect(c.status).toBe(StatusCiclo.EM_ANDAMENTO);
    expect(c.atividades).toHaveLength(0);
    expect(c.editavel).toBe(true);
    expect(c.cargaHoraria.totais).toBe(0);
    expect(c.mediaPersonal).toBeNull();
    expect(c.mediaAutoAvaliacao).toBeNull();
  });

  it.each([
    [{ titulo: "  " }, /título/],
    [{ inicio: "01/09/2026" }, /AAAA-MM-DD/],
    [{ fim: "2026-08-01" }, /antes de começar/],
    [{ horasMinimas: 50 }, /Mínimo/],
  ])("valida a abertura: %p", (over, erro) => {
    expect(() =>
      CicloAvaliacao.abrir({
        id: "c",
        acompanhamentoId: "a",
        alunoId: "al",
        personalId: "pe",
        titulo: "Ciclo",
        inicio: "2026-09-01",
        fim: "2026-09-30",
        horasMinimas: 12,
        horasPeriodo: 40,
        ...over,
      }),
    ).toThrow(erro);
  });
});

describe("CicloAvaliacao — atividades desenvolvidas", () => {
  it("registra o treino como pending e soma a carga horária", () => {
    const c = cicloNovo();
    const local = Coordenada.criar(-19.92, -43.94, AGORA);
    c.registrarAtividade(treino({ local }));
    expect(c.atividades[0]).toMatchObject({
      descricao: "Treino A — peito e tríceps",
      statusSincronizacao: StatusSincronizacao.PENDING,
      local,
    });
    expect(c.cargaHoraria.totais).toBe(1.5);
  });

  it("recusa treino fora das datas do ciclo", () => {
    expect(() => cicloNovo().registrarAtividade(treino({ data: "2026-10-01" }))).toThrow(BusinessRuleError);
  });

  it.each([
    [{ data: "5/9" }, InvalidValueError],
    [{ descricao: "ab" }, InvalidValueError],
    [{ horas: 0 }, InvalidValueError],
    [{ horas: MAX_HORAS_POR_TREINO + 0.5 }, InvalidValueError],
  ])("valida o treino: %p", (over, erro) => {
    expect(() => cicloNovo().registrarAtividade(treino(over))).toThrow(erro);
  });

  it("não aceita o mesmo id duas vezes", () => {
    const c = cicloNovo();
    c.registrarAtividade(treino());
    expect(() => c.registrarAtividade(treino())).toThrow(/já registrada/);
  });

  it("não deixa passar do teto de horas do período", () => {
    const c = cicloNovo();
    for (let i = 0; i < 10; i++) c.registrarAtividade(treino({ id: `t${i}`, horas: 4 }));
    expect(c.cargaHoraria.totais).toBe(40);
    expect(() => c.registrarAtividade(treino({ id: "extra", horas: 1 }))).toThrow(/período/);
  });

  it("depois da primeira assinatura o conteúdo fica bloqueado", () => {
    const c = cicloProntoParaAssinar();
    c.assinar("aluno", assinatura());
    expect(c.editavel).toBe(false);
    expect(() => c.registrarAtividade(treino({ id: "novo" }))).toThrow(/já assinado/);
  });

  it("ciclo aprovado não aceita treino novo", () => {
    expect(() => cicloAprovado().registrarAtividade(treino({ id: "novo" }))).toThrow(/aprovado/);
  });
});

describe("CicloAvaliacao — avaliações", () => {
  const criterios = [Criterio.criar("Execução técnica", 9), Criterio.criar("Frequência", 8)];

  it("registra avaliação do personal e calcula a média", () => {
    const c = cicloNovo();
    c.registrarAvaliacaoPersonal({ criterios, comentario: "  Boa evolução ", agora: AGORA });
    expect(c.avaliacaoPersonal).toMatchObject({
      comentario: "Boa evolução",
      statusSincronizacao: StatusSincronizacao.PENDING,
    });
    expect(c.mediaPersonal).toBe(8.5);
  });

  it("enquanto editável, reavaliar substitui a avaliação anterior", () => {
    const c = cicloNovo();
    c.registrarAutoAvaliacao({ criterios, comentario: "", agora: AGORA });
    c.registrarAutoAvaliacao({ criterios: [Criterio.criar("Disciplina", 5)], comentario: "", agora: AGORA });
    expect(c.autoAvaliacao!.criterios).toHaveLength(1);
    expect(c.mediaAutoAvaliacao).toBe(5);
  });

  it("INVARIANTE: ciclo aprovado bloqueia uma 2ª avaliação", () => {
    const c = cicloAprovado();
    expect(() =>
      c.registrarAvaliacaoPersonal({ criterios, comentario: "", agora: AGORA }),
    ).toThrow("Ciclo aprovado: não aceita uma segunda avaliação.");
    expect(() =>
      c.registrarAutoAvaliacao({ criterios, comentario: "", agora: AGORA }),
    ).toThrow(BusinessRuleError);
  });

  it("relatório assinado também não aceita reavaliação", () => {
    expect(() =>
      cicloAguardandoAprovacao().registrarAvaliacaoPersonal({ criterios, comentario: "", agora: AGORA }),
    ).toThrow(/já assinado/);
  });

  it.each([
    [[], /pelo menos um/],
    [[Criterio.criar("Frequência", 8), Criterio.criar("frequência", 9)], /repetido/],
  ])("valida os critérios", (lista, erro) => {
    expect(() =>
      cicloNovo().registrarAvaliacaoPersonal({ criterios: lista, comentario: "", agora: AGORA }),
    ).toThrow(erro);
  });

  it("limita o comentário a 500 caracteres", () => {
    expect(() =>
      cicloNovo().registrarAvaliacaoPersonal({ criterios, comentario: "x".repeat(501), agora: AGORA }),
    ).toThrow(/500/);
  });
});

describe("CicloAvaliacao — assinaturas e ciclo de vida", () => {
  it("lista o que falta antes de assinar", () => {
    const pendencias = cicloNovo().pendenciasParaAssinar();
    expect(pendencias).toEqual([
      "Faltam 12h de treino pro mínimo do ciclo.",
      "O personal ainda não avaliou o ciclo.",
      "O aluno ainda não fez a autoavaliação.",
    ]);
  });

  it("não assina com pendências", () => {
    expect(() => cicloNovo().assinar("aluno", assinatura())).toThrow(/Faltam 12h/);
  });

  it("uma assinatura mantém em andamento; as duas mandam pra aprovação", () => {
    const c = cicloProntoParaAssinar();
    c.assinar("aluno", assinatura());
    expect(c.status).toBe(StatusCiclo.EM_ANDAMENTO);
    expect(c.assinou("aluno")).toBe(true);
    c.assinar("personal", assinatura());
    expect(c.status).toBe(StatusCiclo.AGUARDANDO_APROVACAO);
  });

  it("ninguém assina duas vezes", () => {
    const c = cicloProntoParaAssinar();
    c.assinar("aluno", assinatura());
    expect(() => c.assinar("aluno", assinatura())).toThrow(/já assinou/);
  });

  it("não assina relatório que já está em aprovação ou aprovado", () => {
    expect(() => cicloAguardandoAprovacao().assinar("aluno", assinatura())).toThrow(/aberto/);
    expect(() => cicloAprovado().assinar("personal", assinatura())).toThrow(/aberto/);
  });

  it("aprova só o que está aguardando aprovação", () => {
    const c = cicloAguardandoAprovacao();
    c.aprovar(AGORA);
    expect(c.status).toBe(StatusCiclo.APROVADO);
    expect(c.aprovadoEm).toEqual(AGORA);
    expect(() => c.aprovar(AGORA)).toThrow(BusinessRuleError);
    expect(() => cicloNovo().aprovar(AGORA)).toThrow(/aguardando/);
  });

  it("devolver apaga as assinaturas, guarda o motivo e reabre pra edição", () => {
    const c = cicloAguardandoAprovacao();
    c.devolver("  Faltou o treino de pernas da semana 3 ", AGORA);
    expect(c.status).toBe(StatusCiclo.DEVOLVIDO);
    expect(c.assinaturas).toHaveLength(0);
    expect(c.devolucoes).toEqual([{ motivo: "Faltou o treino de pernas da semana 3", em: AGORA }]);
    expect(c.editavel).toBe(true);

    c.registrarAtividade(treino({ id: "pernas", data: "2026-09-18", horas: 2 }));
    c.assinar("aluno", assinatura());
    c.assinar("personal", assinatura());
    expect(c.status).toBe(StatusCiclo.AGUARDANDO_APROVACAO);
  });

  it("devolução exige status certo e motivo", () => {
    expect(() => cicloNovo().devolver("motivo qualquer", AGORA)).toThrow(BusinessRuleError);
    expect(() => cicloAguardandoAprovacao().devolver("   ", AGORA)).toThrow(InvalidValueError);
  });
});

describe("CicloAvaliacao — PDF e sincronização", () => {
  it("INVARIANTE: podeGerarPdf só com aprovado + assinaturas sincronizadas", () => {
    expect(cicloProntoParaAssinar().podeGerarPdf()).toBe(false);
    expect(cicloAguardandoAprovacao().podeGerarPdf()).toBe(false);
    expect(cicloAprovado({ assinaturasSincronizadas: false }).podeGerarPdf()).toBe(false);
    expect(cicloAprovado().podeGerarPdf()).toBe(true);
  });

  it("assinatura com erro de envio também bloqueia o PDF", () => {
    const c = cicloAprovado();
    c.marcarSincronizacao("assinatura:personal", StatusSincronizacao.ERROR);
    expect(c.podeGerarPdf()).toBe(false);
  });

  it("lista tudo que precisa subir, com chaves estáveis", () => {
    const chaves = cicloAguardandoAprovacao().itensSincronizaveis().map((i) => `${i.tipo}:${i.chave}`);
    expect(chaves).toEqual([
      "atividade:ativ-1",
      "atividade:ativ-2",
      "atividade:ativ-3",
      "atividade:ativ-4",
      "avaliacao:avaliacao:personal",
      "avaliacao:avaliacao:aluno",
      "assinatura:assinatura:aluno",
      "assinatura:assinatura:personal",
    ]);
  });

  it("marca cada tipo de item", () => {
    const c = cicloAguardandoAprovacao();
    for (const chave of ["ativ-1", "avaliacao:personal", "avaliacao:aluno", "assinatura:aluno"]) {
      c.marcarSincronizacao(chave, StatusSincronizacao.SYNCED);
    }
    const status = Object.fromEntries(c.itensSincronizaveis().map((i) => [i.chave, i.status]));
    expect(status).toMatchObject({
      "ativ-1": "synced",
      "ativ-2": "pending",
      "avaliacao:personal": "synced",
      "avaliacao:aluno": "synced",
      "assinatura:aluno": "synced",
      "assinatura:personal": "pending",
    });
  });

  it("chave desconhecida é erro", () => {
    expect(() => cicloNovo().marcarSincronizacao("assinatura:aluno", "synced")).toThrow(/não existe/);
    expect(() => cicloNovo().marcarSincronizacao("xyz", "synced")).toThrow(/não existe/);
  });

  it("toProps/restaurar preserva o estado e não compartilha listas", () => {
    const original = cicloAguardandoAprovacao();
    const copia = CicloAvaliacao.restaurar(original.toProps());
    expect(copia.status).toBe(original.status);
    expect(copia.atividades).toEqual(original.atividades);
    copia.devolver("mexendo só na cópia", AGORA);
    expect(original.assinaturas).toHaveLength(2);
  });
});
