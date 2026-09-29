import { CargaHoraria } from "../value-objects/carga-horaria";
import {
  ROTULO_STATUS_CICLO,
  StatusCiclo,
  StatusSincronizacao,
} from "../value-objects/status";
import { ROTULO_PAPEL, sessaoValida, type Sessao } from "../value-objects/sessao";
import { InvalidValueError } from "../errors";

describe("CargaHoraria (Value Object)", () => {
  const base = { totais: 6, minimas: 12, periodo: 40 };

  it("sabe quanto falta e o progresso até o mínimo", () => {
    const c = CargaHoraria.criar(base);
    expect(c.cumpriuMinimo).toBe(false);
    expect(c.faltam).toBe(6);
    expect(c.progresso).toBe(0.5);
  });

  it("cumprido: faltam 0 e progresso travado em 1", () => {
    const c = CargaHoraria.criar({ ...base, totais: 20 });
    expect(c.cumpriuMinimo).toBe(true);
    expect(c.faltam).toBe(0);
    expect(c.progresso).toBe(1);
  });

  it("adicionar devolve uma carga nova (imutável)", () => {
    const antes = CargaHoraria.criar(base);
    const depois = antes.adicionar(1.5);
    expect(depois.totais).toBe(7.5);
    expect(antes.totais).toBe(6);
    expect(Object.isFrozen(antes)).toBe(true);
  });

  it("arredonda a 2 casas pra não acumular erro de ponto flutuante", () => {
    expect(CargaHoraria.criar({ ...base, totais: 0 }).adicionar(0.1).adicionar(0.2).totais).toBe(0.3);
  });

  it.each([
    [{ totais: -1, minimas: 12, periodo: 40 }, /totais/],
    [{ totais: 0, minimas: NaN, periodo: 40 }, /mínimas/],
    [{ totais: 0, minimas: 12, periodo: -5 }, /período/],
    [{ totais: 0, minimas: 0, periodo: 40 }, /mínima/],
    [{ totais: 0, minimas: 50, periodo: 40 }, /Mínimo/],
    [{ totais: 41, minimas: 12, periodo: 40 }, /passam do período/],
  ])("valida %p", (input, erro) => {
    expect(() => CargaHoraria.criar(input)).toThrow(erro);
  });

  it("não deixa passar do teto do período ao adicionar", () => {
    expect(() => CargaHoraria.criar({ ...base, totais: 39 }).adicionar(2)).toThrow(InvalidValueError);
  });

  it.each([0, -2, NaN])("não adiciona %p horas", (h) => {
    expect(() => CargaHoraria.criar(base).adicionar(h)).toThrow(InvalidValueError);
  });
});

describe("Enums de status", () => {
  it("StatusSincronizacao é pending | synced | error", () => {
    expect(Object.values(StatusSincronizacao)).toEqual(["pending", "synced", "error"]);
  });

  it("StatusCiclo cobre o ciclo de vida e tem rótulo pra cada valor", () => {
    expect(Object.values(StatusCiclo)).toEqual([
      "em_andamento",
      "aguardando_aprovacao",
      "aprovado",
      "devolvido",
    ]);
    for (const s of Object.values(StatusCiclo)) {
      expect(ROTULO_STATUS_CICLO[s]).toBeTruthy();
    }
  });
});

describe("Sessao", () => {
  const usuario = { id: "u", nome: "U", email: "u@x.com", papel: "aluno" as const };
  const agora = new Date("2026-09-29T12:00:00Z");

  it("sem expiração (provedor renova) é sempre válida", () => {
    const s: Sessao = { usuario, token: "t", expiraEm: null };
    expect(sessaoValida(s, agora)).toBe(true);
  });

  it("vale até o instante da expiração, exclusive", () => {
    expect(sessaoValida({ usuario, token: "t", expiraEm: new Date("2026-09-29T13:00:00Z") }, agora)).toBe(true);
    expect(sessaoValida({ usuario, token: "t", expiraEm: agora }, agora)).toBe(false);
  });

  it("todo papel tem rótulo", () => {
    expect(ROTULO_PAPEL).toEqual({ aluno: "Aluno", personal: "Personal", coordenacao: "Coordenação" });
  });
});
