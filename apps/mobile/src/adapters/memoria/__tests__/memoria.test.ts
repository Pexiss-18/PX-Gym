import { Assinatura, StatusCiclo } from "@px/core";
import { FixedClock, SequenceIds } from "@px/core/testing/fakes";
import { SessionStorageFake } from "@px/core/testing/fakes-ciclo";
import { criarComposicao } from "../../composicao";
import { criarDadosDemo, TOKEN_DEMO } from "../dados-demo";
import {
  AuthGatewayStub,
  PdfGatewaySimulado,
  SENHA_DEMO,
  SincronizacaoGatewaySimulado,
  conectividadeSimulada,
} from "../gateways-simulados";
import {
  AcompanhamentoRepositoryMemoria,
  CicloAvaliacaoRepositoryMemoria,
  TokenPersonalRepositoryMemoria,
} from "../repositorios";
import { base64ParaSvg, svgParaBase64, tracosParaSvg } from "../../screens/assinatura-svg";

const HOJE = new Date(2026, 8, 29, 10, 0); // 29/09/2026, horário local

describe("dados de demonstração (montados pelo próprio domínio)", () => {
  const demo = criarDadosDemo(HOJE);

  it("três ciclos, um em cada fase do ciclo de vida", () => {
    expect(demo.ciclos.map((c) => [c.id, c.status])).toEqual([
      ["ciclo-1", StatusCiclo.APROVADO],
      ["ciclo-2", StatusCiclo.AGUARDANDO_APROVACAO],
      ["ciclo-3", StatusCiclo.EM_ANDAMENTO],
    ]);
  });

  it("datas relativas a hoje: o ciclo atual é o mês corrente", () => {
    const atual = demo.ciclos[2]!;
    expect([atual.inicio, atual.fim]).toEqual(["2026-09-01", "2026-09-30"]);
    expect(demo.ciclos[0]!.inicio).toBe("2026-07-01");
    expect(atual.titulo).toMatch(/setembro/);
  });

  it("o aprovado já tem PDF liberado; o do mês ainda não bateu o mínimo", () => {
    expect(demo.ciclos[0]!.podeGerarPdf()).toBe(true);
    expect(demo.ciclos[2]!.cargaHoraria.cumpriuMinimo).toBe(false);
  });

  it("token do personal válido e acompanhamento ativo hoje", () => {
    expect(demo.tokens[0]!.token).toBe(TOKEN_DEMO);
    expect(demo.tokens[0]!.situacao(HOJE)).toBe("valido");
    expect(demo.acompanhamentos[0]!.estaAtivo("2026-09-29")).toBe(true);
  });

  it("funciona em qualquer mês (ex.: janeiro, virando o ano pra trás)", () => {
    const jan = criarDadosDemo(new Date(2027, 0, 15));
    expect(jan.ciclos[0]!.inicio).toBe("2026-11-01");
    expect(jan.ciclos[2]!.fim).toBe("2027-01-31");
  });
});

describe("repositórios em memória (Map)", () => {
  it("cada leitura devolve um agregado novo: mexer sem salvar não vaza", async () => {
    const repo = new CicloAvaliacaoRepositoryMemoria(criarDadosDemo(HOJE).ciclos);
    const lido = (await repo.porId("ciclo-2"))!;
    lido.aprovar(HOJE);
    expect((await repo.porId("ciclo-2"))!.status).toBe(StatusCiclo.AGUARDANDO_APROVACAO);
    await repo.salvar(lido);
    expect((await repo.porId("ciclo-2"))!.status).toBe(StatusCiclo.APROVADO);
  });

  it("filtra por aluno e por personal", async () => {
    const repo = new CicloAvaliacaoRepositoryMemoria(criarDadosDemo(HOJE).ciclos);
    expect(await repo.listarPorAluno("u-aluno")).toHaveLength(3);
    expect(await repo.listarPorPersonal("u-personal")).toHaveLength(3);
    expect(await repo.listarPorAluno("ninguem")).toHaveLength(0);
    expect(await repo.porId("nao-existe")).toBeNull();
  });

  it("acompanhamentos e tokens", async () => {
    const demo = criarDadosDemo(HOJE);
    const acomp = new AcompanhamentoRepositoryMemoria(demo.acompanhamentos);
    expect((await acomp.porId("acomp-1"))!.academia).toBe("Px GYM Centro");
    expect(await acomp.porId("x")).toBeNull();

    const tokens = new TokenPersonalRepositoryMemoria(demo.tokens);
    const t = (await tokens.porToken(TOKEN_DEMO))!;
    t.revogar(HOJE);
    await tokens.salvar(t);
    expect((await tokens.porToken(TOKEN_DEMO))!.situacao(HOJE)).toBe("revogado");
    expect(await tokens.porToken("X")).toBeNull();
  });

  it("começa vazio sem dados iniciais", async () => {
    expect(await new CicloAvaliacaoRepositoryMemoria().listarTodos()).toEqual([]);
  });
});

describe("gateways simulados", () => {
  it("stub de auth: três contas fixas com a senha de demo", async () => {
    const auth = new AuthGatewayStub(0);
    const ok = await auth.signIn("personal@pxgym.dev", SENHA_DEMO);
    expect(ok).toMatchObject({ ok: true, sessao: { usuario: { papel: "personal" }, expiraEm: null } });
    expect(await auth.signIn("personal@pxgym.dev", "errada")).toEqual({ ok: false, reason: "invalid-credentials" });
    expect(await auth.signIn("ninguem@pxgym.dev", SENHA_DEMO)).toEqual({ ok: false, reason: "invalid-credentials" });
    await expect(auth.signOut()).resolves.toBeUndefined();
  });

  it("stub de cadastro: e-mail de demo já existe; novo pede confirmação", async () => {
    const auth = new AuthGatewayStub(0);
    expect(await auth.signUp("aluno@pxgym.dev")).toEqual({ ok: false, reason: "email-taken" });
    expect(await auth.signUp("novo@pxgym.dev")).toEqual({ ok: true, needsConfirmation: true });
  });

  it("PDF simulado devolve um endereço em memória; sync aceita tudo; sempre online", async () => {
    const uri = await new PdfGatewaySimulado(0).gerar({ cicloId: "ciclo-1" } as never);
    expect(uri).toBe("memoria://relatorios/ciclo-1.pdf");
    await expect(new SincronizacaoGatewaySimulado(0).enviar()).resolves.toBeUndefined();
    expect(await conectividadeSimulada.isOnline()).toBe(true);
  });
});

describe("assinatura em SVG", () => {
  it("traços viram SVG e o base64 é aceito pelo Value Object", () => {
    const svg = tracosParaSvg([[{ x: 1, y: 2 }, { x: 30.26, y: 40 }], [{ x: 5, y: 5 }], []], 300, 120);
    expect(svg).toContain('viewBox="0 0 300 120"');
    expect(svg).toContain('<path d="M1 2 L30.3 40"/>');
    expect(svg).toContain('<path d="M5 5 L5.1 5.1"/>'); // toque único vira um ponto
    const b64 = svgParaBase64(svg);
    expect(base64ParaSvg(b64)).toBe(svg);
    expect(() => Assinatura.criar(b64, HOJE)).not.toThrow();
  });
});

describe("composition root", () => {
  it("monta todos os use cases prontos pra usar, com os dados de demo", async () => {
    const sessoes = new SessionStorageFake();
    const { auth, casos } = criarComposicao({
      clock: new FixedClock(HOJE),
      ids: new SequenceIds(),
      sessoes,
      latenciaMs: 0,
    });

    const login = await auth.autenticar.execute({ email: "coordenacao@pxgym.dev", senha: SENHA_DEMO });
    expect(login.status).toBe("autenticado");
    expect(sessoes.sessao?.usuario.papel).toBe("coordenacao");

    const usuario = sessoes.sessao!.usuario;
    expect(await casos.listarRelatorios.execute({ usuario })).toHaveLength(3);
    const aprovado = await casos.aprovarRelatorio.execute({ usuario, cicloId: "ciclo-2" });
    expect(aprovado.ok && aprovado.valor.status).toBe("aprovado");
    expect(await casos.sincronizarFila.execute()).toMatchObject({ status: "concluido", falhas: 0 });
    expect(await casos.gerarPdf.execute({ usuario, cicloId: "ciclo-2" })).toEqual({
      ok: true,
      valor: { uri: "memoria://relatorios/ciclo-2.pdf" },
    });

    const token = await auth.acessarViaToken.execute({ token: TOKEN_DEMO });
    expect(token.status).toBe("autorizado");
    await auth.encerrar.execute();
    expect(await auth.restaurar.execute()).toBeNull();
  });

  it("sem auth informado usa o stub (fase mock)", async () => {
    const { auth } = criarComposicao({
      clock: new FixedClock(HOJE),
      ids: new SequenceIds(),
      sessoes: new SessionStorageFake(),
      latenciaMs: 0,
    });
    expect((await auth.cadastrar.execute({ email: "novo@pxgym.dev", password: "123456", passwordConfirmation: "123456" })).status).toBe(
      "confirmation-sent",
    );
  });
});
