import { Criterio, DESCRICAO_FAIXA, mediaDosCriterios } from "../value-objects/criterio";
import { InvalidValueError } from "../errors";

describe("Criterio (Value Object)", () => {
  it("guarda nome sem espaços nas pontas e a nota", () => {
    const c = Criterio.criar("  Execução técnica ", 8.5);
    expect(c.nome).toBe("Execução técnica");
    expect(c.nota).toBe(8.5);
  });

  it.each([
    [10, "MB"],
    [9, "MB"],
    [8.5, "B"],
    [7, "B"],
    [6.5, "R"],
    [5, "R"],
    [4.5, "F"],
    [0, "F"],
  ])("nota %p cai na faixa %p", (nota, faixa) => {
    expect(Criterio.criar("Frequência", nota).faixa).toBe(faixa);
  });

  it("cada faixa tem descrição legível", () => {
    expect(DESCRICAO_FAIXA.MB).toBe("Muito bom");
    expect(DESCRICAO_FAIXA.F).toBe("Fraco");
  });

  it.each([-1, 10.5, NaN, Infinity])("rejeita nota fora de 0–10: %p", (nota) => {
    expect(() => Criterio.criar("Frequência", nota)).toThrow(InvalidValueError);
  });

  it("rejeita nota fora do passo de 0,5", () => {
    expect(() => Criterio.criar("Frequência", 7.3)).toThrow(/0,5/);
  });

  it("rejeita critério sem nome", () => {
    expect(() => Criterio.criar("   ", 8)).toThrow(InvalidValueError);
  });

  it("é imutável", () => {
    const c = Criterio.criar("Frequência", 8);
    expect(Object.isFrozen(c)).toBe(true);
    expect(() => {
      (c as { nota: number }).nota = 10;
    }).toThrow(TypeError);
  });

  it("igualdade por valor, não por referência", () => {
    expect(Criterio.criar("A", 8).equals(Criterio.criar("A", 8))).toBe(true);
    expect(Criterio.criar("A", 8).equals(Criterio.criar("A", 9))).toBe(false);
  });

  it("média arredonda a 1 casa e vale 0 sem critérios", () => {
    expect(
      mediaDosCriterios([Criterio.criar("A", 9), Criterio.criar("B", 8), Criterio.criar("C", 8)]),
    ).toBe(8.3);
    expect(mediaDosCriterios([])).toBe(0);
  });
});
