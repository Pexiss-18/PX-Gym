import { InvalidValueError } from "../errors";

/** Faixa de desempenho: Muito Bom, Bom, Regular, Fraco. */
export type Faixa = "MB" | "B" | "R" | "F";

export const DESCRICAO_FAIXA: Record<Faixa, string> = {
  MB: "Muito bom",
  B: "Bom",
  R: "Regular",
  F: "Fraco",
};

/**
 * Um critério avaliado no ciclo (ex.: "Execução técnica", "Frequência"),
 * com nota de 0 a 10 em passos de 0,5. A faixa é derivada da nota — nunca
 * informada — pra que as duas não possam discordar.
 */
export class Criterio {
  private constructor(
    readonly nome: string,
    readonly nota: number,
  ) {
    Object.freeze(this);
  }

  static criar(nome: string, nota: number): Criterio {
    const limpo = nome.trim();
    if (limpo.length === 0) {
      throw new InvalidValueError("O critério precisa de um nome.");
    }
    if (!Number.isFinite(nota) || nota < 0 || nota > 10) {
      throw new InvalidValueError(`Nota fora de 0–10: ${nota}`);
    }
    if (Math.round(nota * 2) !== nota * 2) {
      throw new InvalidValueError(`A nota anda de 0,5 em 0,5: ${nota}`);
    }
    return new Criterio(limpo, nota);
  }

  get faixa(): Faixa {
    if (this.nota >= 9) return "MB";
    if (this.nota >= 7) return "B";
    if (this.nota >= 5) return "R";
    return "F";
  }

  equals(outro: Criterio): boolean {
    return this.nome === outro.nome && this.nota === outro.nota;
  }
}

/** Média simples das notas, arredondada a 1 casa (0 sem critérios). */
export function mediaDosCriterios(criterios: readonly Criterio[]): number {
  if (criterios.length === 0) return 0;
  const soma = criterios.reduce((acc, c) => acc + c.nota, 0);
  return Math.round((soma / criterios.length) * 10) / 10;
}
