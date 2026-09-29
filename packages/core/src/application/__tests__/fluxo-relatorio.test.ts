import { AssinarRelatorioUseCase } from "../use-cases/assinar-relatorio";
import { AprovarRelatorioUseCase } from "../use-cases/aprovar-relatorio";
import { DevolverRelatorioUseCase } from "../use-cases/devolver-relatorio";
import { GerarPdfUseCase } from "../use-cases/gerar-pdf";
import { ConsultarRelatorioUseCase, ListarRelatoriosUseCase } from "../use-cases/consultar-relatorios";
import {
  AcompanhamentoRepositoryFake,
  CicloAvaliacaoRepositoryFake,
  PdfGatewayFake,
} from "../../testing/fakes-ciclo";
import { FixedClock } from "../../testing/fakes";
import {
  AGORA,
  ALUNO,
  ASSINATURA_B64,
  COORDENACAO,
  OUTRO_ALUNO,
  PERSONAL,
  acompanhamentoPadrao,
  cicloAguardandoAprovacao,
  cicloAprovado,
  cicloNovo,
  cicloProntoParaAssinar,
} from "../../testing/cenario-ciclo";
import { CicloAvaliacao } from "../../domain/entities/ciclo-avaliacao";

const clock = new FixedClock(AGORA);

describe("AssinarRelatorioUseCase", () => {
  it("aluno e depois personal assinam: o relatório vai pra aprovação", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloProntoParaAssinar()]);
    const uc = new AssinarRelatorioUseCase(repo, clock);

    const r1 = await uc.execute({ usuario: ALUNO, cicloId: "ciclo-set", assinaturaBase64: ASSINATURA_B64 });
    expect(r1.ok && r1.valor.status).toBe("em_andamento");

    const r2 = await uc.execute({ usuario: PERSONAL, cicloId: "ciclo-set", assinaturaBase64: ASSINATURA_B64 });
    expect(r2.ok && r2.valor.status).toBe("aguardando_aprovacao");
    expect(r2.ok && r2.valor.assinaturas.map((a) => a.signatario)).toEqual(["aluno", "personal"]);
  });

  it("com pendências, recusa e lista o que falta", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloNovo()]);
    const r = await new AssinarRelatorioUseCase(repo, clock).execute({
      usuario: ALUNO,
      cicloId: "ciclo-set",
      assinaturaBase64: ASSINATURA_B64,
    });
    expect(r).toMatchObject({ ok: false, erro: { tipo: "regra-de-negocio", mensagem: expect.stringContaining("Faltam 12h") } });
  });

  it("quadro em branco é dado inválido", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloProntoParaAssinar()]);
    const r = await new AssinarRelatorioUseCase(repo, clock).execute({
      usuario: ALUNO,
      cicloId: "ciclo-set",
      assinaturaBase64: "",
    });
    expect(r).toMatchObject({ ok: false, erro: { tipo: "dados-invalidos" } });
  });

  it.each([
    ["coordenação", COORDENACAO],
    ["outro aluno", OUTRO_ALUNO],
    ["personal de outro ciclo", { ...PERSONAL, id: "u-outro-personal" }],
  ])("%s não assina", async (_n, usuario) => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloProntoParaAssinar()]);
    const r = await new AssinarRelatorioUseCase(repo, clock).execute({
      usuario,
      cicloId: "ciclo-set",
      assinaturaBase64: ASSINATURA_B64,
    });
    expect(r).toMatchObject({ ok: false, erro: { tipo: "sem-permissao" } });
  });

  it("ciclo inexistente", async () => {
    const r = await new AssinarRelatorioUseCase(new CicloAvaliacaoRepositoryFake(), clock).execute({
      usuario: ALUNO,
      cicloId: "x",
      assinaturaBase64: ASSINATURA_B64,
    });
    expect(r).toMatchObject({ ok: false, erro: { tipo: "nao-encontrado" } });
  });
});

describe("AprovarRelatorioUseCase", () => {
  it("coordenação aprova", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloAguardandoAprovacao()]);
    const r = await new AprovarRelatorioUseCase(repo, clock).execute({ usuario: COORDENACAO, cicloId: "ciclo-set" });
    expect(r.ok && r.valor.status).toBe("aprovado");
    expect((await repo.porId("ciclo-set"))!.aprovadoEm).toEqual(AGORA);
  });

  it("aluno e personal não aprovam", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloAguardandoAprovacao()]);
    for (const usuario of [ALUNO, PERSONAL]) {
      const r = await new AprovarRelatorioUseCase(repo, clock).execute({ usuario, cicloId: "ciclo-set" });
      expect(r).toMatchObject({ ok: false, erro: { tipo: "sem-permissao" } });
    }
  });

  it("não aprova relatório sem assinaturas, nem ciclo inexistente", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloProntoParaAssinar()]);
    const uc = new AprovarRelatorioUseCase(repo, clock);
    expect(await uc.execute({ usuario: COORDENACAO, cicloId: "ciclo-set" })).toMatchObject({
      ok: false,
      erro: { tipo: "regra-de-negocio" },
    });
    expect(await uc.execute({ usuario: COORDENACAO, cicloId: "x" })).toMatchObject({
      ok: false,
      erro: { tipo: "nao-encontrado" },
    });
  });
});

describe("DevolverRelatorioUseCase", () => {
  const motivo = "Faltou o treino de pernas da semana 3.";

  it("coordenação devolve com motivo: assinaturas apagadas", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloAguardandoAprovacao()]);
    const r = await new DevolverRelatorioUseCase(repo, clock).execute({ usuario: COORDENACAO, cicloId: "ciclo-set", motivo });
    expect(r.ok && r.valor).toMatchObject({ status: "devolvido", assinaturas: [], devolucoes: [{ motivo }] });
  });

  it.each([
    [ALUNO, motivo, "sem-permissao"],
    [COORDENACAO, "refazer", "dados-invalidos"],
  ] as const)("recusa (%p, %p) → %p", async (usuario, m, tipo) => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloAguardandoAprovacao()]);
    const r = await new DevolverRelatorioUseCase(repo, clock).execute({ usuario, cicloId: "ciclo-set", motivo: m });
    expect(r).toMatchObject({ ok: false, erro: { tipo } });
    expect(repo.salvamentos).toBe(0);
  });

  it("não devolve ciclo aprovado, nem inexistente", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloAprovado()]);
    const uc = new DevolverRelatorioUseCase(repo, clock);
    expect(await uc.execute({ usuario: COORDENACAO, cicloId: "ciclo-set", motivo })).toMatchObject({
      ok: false,
      erro: { tipo: "regra-de-negocio" },
    });
    expect(await uc.execute({ usuario: COORDENACAO, cicloId: "x", motivo })).toMatchObject({
      ok: false,
      erro: { tipo: "nao-encontrado" },
    });
  });
});

describe("GerarPdfUseCase", () => {
  const setup = (ciclo: CicloAvaliacao) => {
    const pdf = new PdfGatewayFake();
    const uc = new GerarPdfUseCase(
      new CicloAvaliacaoRepositoryFake([ciclo]),
      new AcompanhamentoRepositoryFake([acompanhamentoPadrao()]),
      pdf,
    );
    return { pdf, uc };
  };

  it("gera o PDF do relatório aprovado com os dados do acompanhamento", async () => {
    const { pdf, uc } = setup(cicloAprovado());
    const r = await uc.execute({ usuario: ALUNO, cicloId: "ciclo-set" });

    expect(r).toEqual({ ok: true, valor: { uri: "memoria://relatorios/ciclo-set.pdf" } });
    expect(pdf.gerados[0]).toMatchObject({
      alunoNome: "Paulo Rogério",
      personalNome: "Carla Mendes",
      academia: "Px GYM Centro",
      periodo: "2026-09-01 a 2026-09-30",
      horasTotais: 12,
      horasMinimas: 12,
      aprovadoEm: AGORA,
    });
    expect(pdf.gerados[0]!.atividades.map((a) => a.data)).toEqual([
      "2026-09-02",
      "2026-09-09",
      "2026-09-16",
      "2026-09-23",
    ]);
    expect(pdf.gerados[0]!.avaliacaoPersonal[0]).toEqual({ nome: "Execução técnica", nota: 9, faixa: "MB" });
    expect(pdf.gerados[0]!.assinaturas).toHaveLength(2);
  });

  it("assinaturas ainda não sincronizadas: recusa e explica", async () => {
    const { pdf, uc } = setup(cicloAprovado({ assinaturasSincronizadas: false }));
    const r = await uc.execute({ usuario: COORDENACAO, cicloId: "ciclo-set" });
    expect(r).toMatchObject({ ok: false, erro: { tipo: "regra-de-negocio", mensagem: expect.stringContaining("nuvem") } });
    expect(pdf.gerados).toHaveLength(0);
  });

  it("quem não participa não gera", async () => {
    const { uc } = setup(cicloAprovado());
    expect(await uc.execute({ usuario: OUTRO_ALUNO, cicloId: "ciclo-set" })).toMatchObject({
      ok: false,
      erro: { tipo: "sem-permissao" },
    });
  });

  it("falha do gerador vira falha-externa", async () => {
    const { pdf, uc } = setup(cicloAprovado());
    pdf.falharProximo = true;
    expect(await uc.execute({ usuario: ALUNO, cicloId: "ciclo-set" })).toMatchObject({
      ok: false,
      erro: { tipo: "falha-externa" },
    });
  });

  it("ciclo ou acompanhamento inexistente", async () => {
    const semAcomp = new GerarPdfUseCase(
      new CicloAvaliacaoRepositoryFake([cicloAprovado()]),
      new AcompanhamentoRepositoryFake(),
      new PdfGatewayFake(),
    );
    expect(await semAcomp.execute({ usuario: ALUNO, cicloId: "ciclo-set" })).toMatchObject({
      ok: false,
      erro: { tipo: "nao-encontrado" },
    });
    expect(await semAcomp.execute({ usuario: ALUNO, cicloId: "x" })).toMatchObject({
      ok: false,
      erro: { tipo: "nao-encontrado" },
    });
  });
});

describe("ListarRelatoriosUseCase / ConsultarRelatorioUseCase", () => {
  const repo = () => {
    const agosto = CicloAvaliacao.abrir({
      id: "ciclo-ago",
      acompanhamentoId: "acomp-1",
      alunoId: ALUNO.id,
      personalId: PERSONAL.id,
      titulo: "Ciclo de agosto",
      inicio: "2026-08-01",
      fim: "2026-08-31",
      horasMinimas: 12,
      horasPeriodo: 40,
    });
    const deOutro = CicloAvaliacao.abrir({
      id: "ciclo-outro",
      acompanhamentoId: "acomp-2",
      alunoId: OUTRO_ALUNO.id,
      personalId: "u-outro-personal",
      titulo: "Outro",
      inicio: "2026-09-01",
      fim: "2026-09-30",
      horasMinimas: 12,
      horasPeriodo: 40,
    });
    return new CicloAvaliacaoRepositoryFake([agosto, cicloNovo(), deOutro]);
  };

  it("aluno vê os próprios, do mais recente pro mais antigo", async () => {
    const lista = await new ListarRelatoriosUseCase(repo()).execute({ usuario: ALUNO });
    expect(lista.map((c) => c.id)).toEqual(["ciclo-set", "ciclo-ago"]);
    expect(lista[0]!.rotuloStatus).toBe("Em andamento");
  });

  it("personal vê os ciclos em que é o personal; coordenação vê todos", async () => {
    expect((await new ListarRelatoriosUseCase(repo()).execute({ usuario: PERSONAL })).map((c) => c.id)).toEqual([
      "ciclo-set",
      "ciclo-ago",
    ]);
    expect(await new ListarRelatoriosUseCase(repo()).execute({ usuario: COORDENACAO })).toHaveLength(3);
  });

  it("consultar: acesso conferido", async () => {
    const uc = new ConsultarRelatorioUseCase(repo());
    expect((await uc.execute({ usuario: ALUNO, cicloId: "ciclo-set" })).ok).toBe(true);
    expect(await uc.execute({ usuario: ALUNO, cicloId: "ciclo-outro" })).toMatchObject({
      ok: false,
      erro: { tipo: "sem-permissao" },
    });
    expect(await uc.execute({ usuario: COORDENACAO, cicloId: "nada" })).toMatchObject({
      ok: false,
      erro: { tipo: "nao-encontrado" },
    });
  });
});
