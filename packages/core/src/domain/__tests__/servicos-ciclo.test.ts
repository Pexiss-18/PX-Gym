import { RegraGeracaoPdfService } from "../services/regra-geracao-pdf";
import { RegraDevolucaoService, MINIMO_MOTIVO_DEVOLUCAO } from "../services/regra-devolucao";
import { SincronizacaoService } from "../services/sincronizacao";
import { StatusSincronizacao } from "../value-objects/status";
import {
  cicloAguardandoAprovacao,
  cicloAprovado,
  cicloNovo,
  cicloProntoParaAssinar,
} from "../../testing/cenario-ciclo";

describe("RegraGeracaoPdfService", () => {
  const regra = new RegraGeracaoPdfService();

  it("libera ciclo aprovado com assinaturas na nuvem", () => {
    expect(regra.verificar(cicloAprovado())).toEqual({ permitido: true });
  });

  it("explica tudo que falta num ciclo em andamento", () => {
    expect(regra.verificar(cicloProntoParaAssinar())).toEqual({
      permitido: false,
      pendencias: [
        "O relatório ainda não foi aprovado pela coordenação.",
        "Falta a assinatura do aluno.",
        "Falta a assinatura do personal.",
      ],
    });
  });

  it("aprovado mas com assinatura ainda local: diz qual", () => {
    const c = cicloAprovado({ assinaturasSincronizadas: false });
    c.marcarSincronizacao("assinatura:aluno", StatusSincronizacao.SYNCED);
    expect(regra.verificar(c)).toEqual({
      permitido: false,
      pendencias: ["A assinatura do personal ainda não chegou na nuvem."],
    });
  });
});

describe("RegraDevolucaoService", () => {
  const regra = new RegraDevolucaoService();
  const motivo = "Faltou registrar o treino de pernas.";

  it("coordenação devolve relatório aguardando aprovação com motivo", () => {
    expect(regra.verificar({ ciclo: cicloAguardandoAprovacao(), papel: "coordenacao", motivo })).toEqual({
      permitido: true,
    });
  });

  it.each(["aluno", "personal"] as const)("%s não devolve", (papel) => {
    expect(regra.verificar({ ciclo: cicloAguardandoAprovacao(), papel, motivo })).toMatchObject({
      permitido: false,
      motivo: "sem-permissao",
    });
  });

  it("não devolve o que não está aguardando aprovação", () => {
    for (const ciclo of [cicloNovo(), cicloAprovado()]) {
      expect(regra.verificar({ ciclo, papel: "coordenacao", motivo })).toMatchObject({
        permitido: false,
        motivo: "status-invalido",
      });
    }
  });

  it(`motivo precisa de ${MINIMO_MOTIVO_DEVOLUCAO}+ caracteres`, () => {
    expect(
      regra.verificar({ ciclo: cicloAguardandoAprovacao(), papel: "coordenacao", motivo: "  refazer  " }),
    ).toMatchObject({ permitido: false, motivo: "motivo-curto" });
  });
});

describe("SincronizacaoService", () => {
  const servico = new SincronizacaoService();

  it("fila: assinaturas primeiro, depois avaliações, depois atividades", () => {
    const tipos = servico.montarFila([cicloAguardandoAprovacao()]).map((i) => i.tipo);
    expect(tipos).toEqual([
      "assinatura",
      "assinatura",
      "avaliacao",
      "avaliacao",
      "atividade",
      "atividade",
      "atividade",
      "atividade",
    ]);
  });

  it("sincronizado sai da fila; erro volta e passa na frente do pending do mesmo tipo", () => {
    const c = cicloProntoParaAssinar();
    c.marcarSincronizacao("ativ-1", StatusSincronizacao.SYNCED);
    c.marcarSincronizacao("ativ-3", StatusSincronizacao.ERROR);
    const atividades = servico.montarFila([c]).filter((i) => i.tipo === "atividade");
    expect(atividades.map((i) => i.chave)).toEqual(["ativ-3", "ativ-2", "ativ-4"]);
  });

  it("junta vários ciclos e resume por status", () => {
    const a = cicloAprovado({}, "c1"); // 2 assinaturas synced + 6 pending
    const b = cicloNovo("c2");
    b.registrarAtividade({ id: "x", data: "2026-09-03", descricao: "Cardio", horas: 1, local: null });
    b.marcarSincronizacao("x", StatusSincronizacao.ERROR);
    expect(servico.resumir([a, b])).toEqual({ pendentes: 6, comErro: 1, sincronizados: 2 });
    expect(servico.montarFila([a, b])).toHaveLength(7);
  });
});
