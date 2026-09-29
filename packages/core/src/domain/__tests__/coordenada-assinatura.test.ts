import { Coordenada } from "../value-objects/coordenada";
import { Assinatura } from "../value-objects/assinatura";
import { InvalidValueError } from "../errors";
import { ASSINATURA_B64 } from "../../testing/cenario-ciclo";

const QUANDO = new Date("2026-09-10T18:30:00Z");

describe("Coordenada (Value Object)", () => {
  it("guarda latitude, longitude e marca temporal", () => {
    const c = Coordenada.criar(-19.9167, -43.9345, QUANDO);
    expect(c.latitude).toBe(-19.9167);
    expect(c.longitude).toBe(-43.9345);
    expect(c.timestamp.toISOString()).toBe("2026-09-10T18:30:00.000Z");
  });

  it.each([
    [91, 0],
    [-91, 0],
    [0, 181],
    [0, -181],
    [NaN, 0],
  ])("rejeita (%p, %p)", (lat, lng) => {
    expect(() => Coordenada.criar(lat, lng, QUANDO)).toThrow(InvalidValueError);
  });

  it("rejeita data inválida", () => {
    expect(() => Coordenada.criar(0, 0, new Date("ontem"))).toThrow(/temporal/);
  });

  it("não é afetada se o Date original mudar depois", () => {
    const d = new Date(QUANDO);
    const c = Coordenada.criar(0, 0, d);
    d.setFullYear(2000);
    expect(c.timestamp.getFullYear()).toBe(2026);
    expect(Object.isFrozen(c)).toBe(true);
  });

  it("calcula distância em metros (Praça Sete → Savassi ≈ 1,6 km)", () => {
    const pracaSete = Coordenada.criar(-19.9191, -43.9386, QUANDO);
    const savassi = Coordenada.criar(-19.9385, -43.9343, QUANDO);
    expect(pracaSete.distanciaAte(savassi)).toBeGreaterThan(1500);
    expect(pracaSete.distanciaAte(savassi)).toBeLessThan(2500);
  });

  it("igualdade por valor", () => {
    expect(Coordenada.criar(1, 2, QUANDO).equals(Coordenada.criar(1, 2, QUANDO))).toBe(true);
    expect(Coordenada.criar(1, 2, QUANDO).equals(Coordenada.criar(1, 3, QUANDO))).toBe(false);
  });
});

describe("Assinatura (Value Object)", () => {
  it("aceita base64 puro e expõe como data URI", () => {
    const a = Assinatura.criar(ASSINATURA_B64, QUANDO);
    expect(a.base64).toBe(ASSINATURA_B64);
    expect(a.dataUri).toBe(`data:image/svg+xml;base64,${ASSINATURA_B64}`);
    expect(a.timestamp.getTime()).toBe(QUANDO.getTime());
  });

  it("aceita data URI e guarda só o base64", () => {
    const a = Assinatura.criar(`data:image/svg+xml;base64,${ASSINATURA_B64}`, QUANDO);
    expect(a.base64).toBe(ASSINATURA_B64);
  });

  it("rejeita quadro vazio ou um toque acidental", () => {
    expect(() => Assinatura.criar("", QUANDO)).toThrow(/vazia/);
    expect(() => Assinatura.criar("QUJD", QUANDO)).toThrow(/vazia/);
  });

  it("rejeita o que não é base64", () => {
    expect(() => Assinatura.criar("isto não é base64 de jeito nenhum!!", QUANDO)).toThrow(/base64/);
    expect(() => Assinatura.criar(ASSINATURA_B64 + "A", QUANDO)).toThrow(/base64/);
  });

  it("rejeita data inválida", () => {
    expect(() => Assinatura.criar(ASSINATURA_B64, new Date(NaN))).toThrow(InvalidValueError);
  });

  it("é imutável e compara por valor", () => {
    const a = Assinatura.criar(ASSINATURA_B64, QUANDO);
    expect(Object.isFrozen(a)).toBe(true);
    expect(a.equals(Assinatura.criar(ASSINATURA_B64, QUANDO))).toBe(true);
    expect(a.equals(Assinatura.criar(ASSINATURA_B64, new Date(0)))).toBe(false);
  });
});
