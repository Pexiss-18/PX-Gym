import { Acompanhamento } from "../entities/acompanhamento";
import { TokenPersonal, VALIDADE_MAXIMA_HORAS } from "../entities/token-personal";
import { BusinessRuleError, InvalidValueError } from "../errors";
import { AGORA, acompanhamentoPadrao, tokenPadrao } from "../../testing/cenario-ciclo";

describe("Acompanhamento (o vínculo aluno ↔ personal)", () => {
  it("está ativo dentro das datas", () => {
    const a = acompanhamentoPadrao();
    expect(a.estaAtivo("2026-09-29")).toBe(true);
    expect(a.estaAtivo("2026-07-31")).toBe(false);
    expect(a.estaAtivo("2027-01-01")).toBe(false);
  });

  it("encerrado antes da hora deixa de estar ativo, e não encerra duas vezes", () => {
    const a = acompanhamentoPadrao();
    a.encerrar("2026-10-10");
    expect(a.encerradoEm).toBe("2026-10-10");
    expect(a.estaAtivo("2026-10-11")).toBe(false);
    expect(() => a.encerrar("2026-10-12")).toThrow(BusinessRuleError);
  });

  it("sabe quem participa", () => {
    const a = acompanhamentoPadrao();
    expect(a.participa("u-aluno")).toBe(true);
    expect(a.participa("u-personal")).toBe(true);
    expect(a.participa("u-coord")).toBe(false);
  });

  it.each([
    [{ inicio: "2026/08/01" }, /AAAA-MM-DD/],
    [{ fim: "2026-07-01" }, /antes de começar/],
    [{ personalId: "u-aluno" }, /diferentes/],
  ])("valida %p", (over, erro) => {
    expect(() =>
      Acompanhamento.iniciar({
        id: "x",
        alunoId: "u-aluno",
        alunoNome: "A",
        personalId: "u-personal",
        personalNome: "P",
        academia: "Px",
        inicio: "2026-08-01",
        fim: "2026-12-31",
        ...over,
      }),
    ).toThrow(erro);
  });

  it("restaura das props sem perder dados", () => {
    const a = acompanhamentoPadrao();
    const b = Acompanhamento.restaurar(a.toProps());
    expect(b.toProps()).toEqual(a.toProps());
    expect([b.id, b.alunoNome, b.personalNome, b.academia, b.inicio, b.fim]).toEqual([
      "acomp-1",
      "Paulo Rogério",
      "Carla Mendes",
      "Px GYM Centro",
      "2026-08-01",
      "2026-12-31",
    ]);
  });
});

describe("TokenPersonal (acesso do personal sem conta)", () => {
  it("é válido até expirar", () => {
    const t = tokenPadrao(72);
    expect(t.situacao(AGORA)).toBe("valido");
    expect(t.situacao(new Date(AGORA.getTime() + 71 * 3600e3))).toBe("valido");
    expect(t.situacao(new Date(AGORA.getTime() + 72 * 3600e3))).toBe("expirado");
  });

  it("revogado nunca volta a valer, e não revoga duas vezes", () => {
    const t = tokenPadrao();
    t.revogar(AGORA);
    expect(t.situacao(AGORA)).toBe("revogado");
    expect(t.revogadoEm).toEqual(AGORA);
    expect(() => t.revogar(AGORA)).toThrow(BusinessRuleError);
  });

  it("normaliza o código pra maiúsculas", () => {
    const t = TokenPersonal.emitir({
      token: "  carla-2026 ",
      acompanhamentoId: "a",
      personalId: "p",
      personalNome: "Carla",
      agora: AGORA,
      validadeHoras: 1,
    });
    expect(t.token).toBe("CARLA-2026");
  });

  it.each([
    [{ token: "curto" }, /8\+/],
    [{ validadeHoras: 0 }, /Validade/],
    [{ validadeHoras: VALIDADE_MAXIMA_HORAS + 1 }, /Validade/],
  ])("valida %p", (over, erro) => {
    expect(() =>
      TokenPersonal.emitir({
        token: "CARLA-2026",
        acompanhamentoId: "a",
        personalId: "p",
        personalNome: "Carla",
        agora: AGORA,
        validadeHoras: 24,
        ...over,
      }),
    ).toThrow(InvalidValueError);
    expect(() => TokenPersonal.emitir({ token: "CARLA-2026", acompanhamentoId: "a", personalId: "p", personalNome: "C", agora: AGORA, validadeHoras: 24, ...over })).toThrow(erro);
  });

  it("restaura das props", () => {
    const t = tokenPadrao();
    const r = TokenPersonal.restaurar(t.toProps());
    expect([r.token, r.acompanhamentoId, r.personalId, r.personalNome]).toEqual([
      "CARLA-2026",
      "acomp-1",
      "u-personal",
      "Carla Mendes",
    ]);
    expect(r.expiraEm).toEqual(t.expiraEm);
  });
});
