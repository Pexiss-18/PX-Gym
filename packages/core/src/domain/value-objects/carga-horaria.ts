import { InvalidValueError } from "../errors";

/**
 * Horas de treino de um ciclo: quantas foram feitas (totais), quantas o
 * ciclo exige (mínimas) e o teto que o período comporta (período — ex.:
 * 4 semanas × 10h). Imutável: somar horas devolve uma carga nova.
 */
export class CargaHoraria {
  private constructor(
    readonly totais: number,
    readonly minimas: number,
    readonly periodo: number,
  ) {
    Object.freeze(this);
  }

  static criar(input: {
    totais: number;
    minimas: number;
    periodo: number;
  }): CargaHoraria {
    const { totais, minimas, periodo } = input;
    for (const [nome, valor] of [
      ["totais", totais],
      ["mínimas", minimas],
      ["do período", periodo],
    ] as const) {
      if (!Number.isFinite(valor) || valor < 0) {
        throw new InvalidValueError(`Horas ${nome} inválidas: ${valor}`);
      }
    }
    if (minimas === 0) {
      throw new InvalidValueError("O ciclo precisa exigir alguma hora mínima.");
    }
    if (minimas > periodo) {
      throw new InvalidValueError(
        `Mínimo (${minimas}h) maior que o período comporta (${periodo}h).`,
      );
    }
    if (totais > periodo) {
      throw new InvalidValueError(
        `Horas registradas (${totais}h) passam do período (${periodo}h).`,
      );
    }
    return new CargaHoraria(arredondar(totais), minimas, periodo);
  }

  adicionar(horas: number): CargaHoraria {
    if (!Number.isFinite(horas) || horas <= 0) {
      throw new InvalidValueError(`Horas a adicionar inválidas: ${horas}`);
    }
    return CargaHoraria.criar({
      totais: this.totais + horas,
      minimas: this.minimas,
      periodo: this.periodo,
    });
  }

  get cumpriuMinimo(): boolean {
    return this.totais >= this.minimas;
  }

  /** Horas que ainda faltam pro mínimo (0 quando cumprido). */
  get faltam(): number {
    return arredondar(Math.max(0, this.minimas - this.totais));
  }

  /** 0..1 do mínimo cumprido, travado em 1. */
  get progresso(): number {
    return Math.min(1, this.totais / this.minimas);
  }
}

function arredondar(horas: number): number {
  return Math.round(horas * 100) / 100;
}
