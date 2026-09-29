import { RegistrarAtividadesUseCase, type NovaAtividade } from "../use-cases/registrar-atividades";
import { AvaliarDesempenhoUseCase } from "../use-cases/avaliar-desempenho";
import { RealizarAutoAvaliacaoUseCase } from "../use-cases/realizar-auto-avaliacao";
import { CicloAvaliacaoRepositoryFake } from "../../testing/fakes-ciclo";
import { FixedClock, SequenceIds } from "../../testing/fakes";
import {
  AGORA,
  ALUNO,
  COORDENACAO,
  OUTRO_ALUNO,
  PERSONAL,
  cicloAprovado,
  cicloNovo,
} from "../../testing/cenario-ciclo";

const treino = (over: Partial<NovaAtividade> = {}): NovaAtividade => ({
  data: "2026-09-10",
  descricao: "Treino B — costas e bíceps",
  horas: 1.5,
  local: { latitude: -19.92, longitude: -43.94, timestamp: AGORA },
  ...over,
});

describe("RegistrarAtividadesUseCase", () => {
  const setup = (ciclo = cicloNovo()) => {
    const repo = new CicloAvaliacaoRepositoryFake([ciclo]);
    return { repo, useCase: new RegistrarAtividadesUseCase(repo, new SequenceIds()) };
  };

  it("caminho feliz: registra o lote, salva e devolve a leitura atualizada", async () => {
    const { repo, useCase } = setup();
    const r = await useCase.execute({
      usuario: ALUNO,
      cicloId: "ciclo-set",
      atividades: [treino(), treino({ data: "2026-09-12", horas: 2, local: null })],
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.horas.totais).toBe(3.5);
    expect(r.valor.atividades.map((a) => a.id)).toEqual(["id-2", "id-1"]); // mais recente primeiro
    expect(r.valor.atividades[1]!.local).toEqual({ latitude: -19.92, longitude: -43.94 });
    expect((await repo.porId("ciclo-set"))!.atividades).toHaveLength(2);
  });

  it("tudo ou nada: um treino inválido no lote e nenhum é salvo", async () => {
    const { repo, useCase } = setup();
    const r = await useCase.execute({
      usuario: ALUNO,
      cicloId: "ciclo-set",
      atividades: [treino(), treino({ data: "2026-10-15" })],
    });

    expect(r).toEqual({
      ok: false,
      erro: { tipo: "regra-de-negocio", mensagem: expect.stringContaining("fora do ciclo") },
    });
    expect(repo.salvamentos).toBe(0);
    expect((await repo.porId("ciclo-set"))!.atividades).toHaveLength(0);
  });

  it("coordenada inválida vira dados-invalidos", async () => {
    const { useCase } = setup();
    const r = await useCase.execute({
      usuario: ALUNO,
      cicloId: "ciclo-set",
      atividades: [treino({ local: { latitude: 200, longitude: 0, timestamp: AGORA } })],
    });
    expect(r).toMatchObject({ ok: false, erro: { tipo: "dados-invalidos" } });
  });

  it.each([
    ["personal", PERSONAL],
    ["coordenação", COORDENACAO],
    ["outro aluno", OUTRO_ALUNO],
  ])("%s não registra treino do aluno", async (_nome, usuario) => {
    const { repo, useCase } = setup();
    const r = await useCase.execute({ usuario, cicloId: "ciclo-set", atividades: [treino()] });
    expect(r).toMatchObject({ ok: false, erro: { tipo: "sem-permissao" } });
    expect(repo.salvamentos).toBe(0);
  });

  it("ciclo inexistente e lote vazio", async () => {
    const { useCase } = setup();
    expect(
      await useCase.execute({ usuario: ALUNO, cicloId: "nao-existe", atividades: [treino()] }),
    ).toMatchObject({ ok: false, erro: { tipo: "nao-encontrado" } });
    expect(
      await useCase.execute({ usuario: ALUNO, cicloId: "ciclo-set", atividades: [] }),
    ).toMatchObject({ ok: false, erro: { tipo: "dados-invalidos" } });
  });

  it("ciclo aprovado recusa treino novo", async () => {
    const { useCase } = setup(cicloAprovado());
    const r = await useCase.execute({ usuario: ALUNO, cicloId: "ciclo-set", atividades: [treino()] });
    expect(r).toMatchObject({ ok: false, erro: { tipo: "regra-de-negocio" } });
  });
});

describe("AvaliarDesempenhoUseCase (personal)", () => {
  const criterios = [
    { nome: "Execução técnica", nota: 9 },
    { nome: "Frequência", nota: 7 },
  ];

  it("o personal do ciclo avalia; a leitura traz faixas e média", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloNovo()]);
    const r = await new AvaliarDesempenhoUseCase(repo, new FixedClock(AGORA)).execute({
      usuario: PERSONAL,
      cicloId: "ciclo-set",
      criterios,
      comentario: "Boa semana",
    });

    expect(r.ok && r.valor.avaliacaoPersonal).toEqual({
      criterios: [
        { nome: "Execução técnica", nota: 9, faixa: "MB" },
        { nome: "Frequência", nota: 7, faixa: "B" },
      ],
      comentario: "Boa semana",
      media: 8,
      registradaEm: AGORA,
      statusSincronizacao: "pending",
    });
  });

  it("aluno não avalia a si mesmo por aqui", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloNovo()]);
    const r = await new AvaliarDesempenhoUseCase(repo, new FixedClock(AGORA)).execute({
      usuario: ALUNO,
      cicloId: "ciclo-set",
      criterios,
      comentario: "",
    });
    expect(r).toMatchObject({ ok: false, erro: { tipo: "sem-permissao" } });
  });

  it("nota fora de 0–10 é dado inválido", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloNovo()]);
    const r = await new AvaliarDesempenhoUseCase(repo, new FixedClock(AGORA)).execute({
      usuario: PERSONAL,
      cicloId: "ciclo-set",
      criterios: [{ nome: "Frequência", nota: 11 }],
      comentario: "",
    });
    expect(r).toMatchObject({ ok: false, erro: { tipo: "dados-invalidos" } });
  });

  it("2ª avaliação em ciclo aprovado é bloqueada pela invariante", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloAprovado()]);
    const r = await new AvaliarDesempenhoUseCase(repo, new FixedClock(AGORA)).execute({
      usuario: PERSONAL,
      cicloId: "ciclo-set",
      criterios,
      comentario: "",
    });
    expect(r).toEqual({
      ok: false,
      erro: { tipo: "regra-de-negocio", mensagem: "Ciclo aprovado: não aceita uma segunda avaliação." },
    });
  });

  it("ciclo inexistente", async () => {
    const r = await new AvaliarDesempenhoUseCase(new CicloAvaliacaoRepositoryFake(), new FixedClock(AGORA)).execute({
      usuario: PERSONAL,
      cicloId: "x",
      criterios,
      comentario: "",
    });
    expect(r).toMatchObject({ ok: false, erro: { tipo: "nao-encontrado" } });
  });
});

describe("RealizarAutoAvaliacaoUseCase (aluno)", () => {
  const criterios = [{ nome: "Disciplina", nota: 8 }];

  it("o aluno se autoavalia", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloNovo()]);
    const r = await new RealizarAutoAvaliacaoUseCase(repo, new FixedClock(AGORA)).execute({
      usuario: ALUNO,
      cicloId: "ciclo-set",
      criterios,
      comentario: "",
    });
    expect(r.ok && r.valor.autoAvaliacao?.media).toBe(8);
  });

  it("personal não preenche a autoavaliação do aluno", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloNovo()]);
    const r = await new RealizarAutoAvaliacaoUseCase(repo, new FixedClock(AGORA)).execute({
      usuario: PERSONAL,
      cicloId: "ciclo-set",
      criterios,
      comentario: "",
    });
    expect(r).toMatchObject({ ok: false, erro: { tipo: "sem-permissao" } });
  });

  it("critério repetido e ciclo inexistente", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloNovo()]);
    const uc = new RealizarAutoAvaliacaoUseCase(repo, new FixedClock(AGORA));
    expect(
      await uc.execute({ usuario: ALUNO, cicloId: "ciclo-set", criterios: [...criterios, ...criterios], comentario: "" }),
    ).toMatchObject({ ok: false, erro: { tipo: "dados-invalidos" } });
    expect(
      await uc.execute({ usuario: ALUNO, cicloId: "x", criterios, comentario: "" }),
    ).toMatchObject({ ok: false, erro: { tipo: "nao-encontrado" } });
  });
});
