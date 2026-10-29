import { InvalidValueError } from "../errors";

/**
 * Formato em que toda foto de progresso é guardada: retrato 9:16 em
 * 1080×1920 (o tamanho do Story do Instagram), JPEG com qualidade 92%.
 * Mantém as fotos comparáveis entre si e leves (~300–500 KB).
 */
export const FORMATO_FOTO_PROGRESSO = {
  largura: 1080,
  altura: 1920,
  qualidade: 0.92,
} as const;

/** Retângulo em pixels da imagem original. */
export type Recorte = {
  x: number;
  y: number;
  largura: number;
  altura: number;
};

const RETRATO = 9 / 16;

function medida(valor: number, nome: string): number {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new InvalidValueError(`${nome} da foto inválida: ${valor}`);
  }
  return valor;
}

/**
 * Maior retângulo 9:16 em pé que cabe na foto, centralizado. A câmera tira
 * em 4:3, então normalmente sobra imagem nas laterais e o corte é ali.
 */
export function recorteRetrato(largura: number, altura: number): Recorte {
  medida(largura, "Largura");
  medida(altura, "Altura");

  if (largura / altura > RETRATO) {
    // mais larga que 9:16: mantém a altura, corta as laterais
    const l = Math.max(1, Math.floor(altura * RETRATO));
    return { x: Math.floor((largura - l) / 2), y: 0, largura: l, altura };
  }
  // mais alta que 9:16: mantém a largura, corta em cima e embaixo
  const a = Math.max(1, Math.floor(largura / RETRATO));
  return { x: 0, y: Math.floor((altura - a) / 2), largura, altura: a };
}
