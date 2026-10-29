import {
  FORMATO_FOTO_PROGRESSO,
  recorteRetrato,
} from "../services/enquadramento-foto";
import { InvalidValueError } from "../errors";

describe("formato da foto de progresso", () => {
  it("é 1080×1920 (9:16, o tamanho do Story) com qualidade 92%", () => {
    expect(FORMATO_FOTO_PROGRESSO).toEqual({
      largura: 1080,
      altura: 1920,
      qualidade: 0.92,
    });
    expect(FORMATO_FOTO_PROGRESSO.largura / FORMATO_FOTO_PROGRESSO.altura).toBe(9 / 16);
  });
});

describe("recorteRetrato (maior 9:16 centralizado)", () => {
  it("foto 4:3 em pé (12 MP): mantém a altura e corta as laterais", () => {
    expect(recorteRetrato(3024, 4032)).toEqual({
      x: 378,
      y: 0,
      largura: 2268,
      altura: 4032,
    });
  });

  it("foto deitada: continua saindo em pé, recortada no meio", () => {
    expect(recorteRetrato(4032, 3024)).toEqual({
      x: 1165,
      y: 0,
      largura: 1701,
      altura: 3024,
    });
  });

  it("foto já em 9:16: usa a imagem inteira", () => {
    expect(recorteRetrato(1080, 1920)).toEqual({
      x: 0,
      y: 0,
      largura: 1080,
      altura: 1920,
    });
  });

  it("foto mais alta que 9:16 (tela 20:9): mantém a largura e corta em cima e embaixo", () => {
    expect(recorteRetrato(1080, 2400)).toEqual({
      x: 0,
      y: 240,
      largura: 1080,
      altura: 1920,
    });
  });

  it("o recorte nunca passa da borda da imagem", () => {
    const tamanhos: [number, number][] = [[3000, 4000], [1, 1], [999, 1777], [4000, 3001]];
    for (const [l, a] of tamanhos) {
      const r = recorteRetrato(l, a);
      expect(r.x + r.largura).toBeLessThanOrEqual(l);
      expect(r.y + r.altura).toBeLessThanOrEqual(a);
      expect(r.largura).toBeGreaterThan(0);
      expect(r.altura).toBeGreaterThan(0);
    }
  });

  it("dimensão inválida vinda da câmera não entra no domínio", () => {
    expect(() => recorteRetrato(0, 1920)).toThrow(InvalidValueError);
    expect(() => recorteRetrato(1080, -1)).toThrow(InvalidValueError);
    expect(() => recorteRetrato(Number.NaN, 1920)).toThrow(InvalidValueError);
  });
});
