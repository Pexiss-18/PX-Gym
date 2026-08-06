import { InvalidValueError } from "../errors";

/** Percentual de gordura corporal, precisão de 0.1 ponto. */
export class BodyFatPct {
  private constructor(readonly pct: number) {}

  static of(pct: number): BodyFatPct {
    if (!Number.isFinite(pct) || pct < 1 || pct > 70) {
      throw new InvalidValueError(`Percentual de gordura inválido: ${pct}%`);
    }
    return new BodyFatPct(Math.round(pct * 10) / 10);
  }

  deltaFrom(previous: BodyFatPct): number {
    return Math.round((this.pct - previous.pct) * 10) / 10;
  }
}
