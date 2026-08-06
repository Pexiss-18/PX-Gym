import { InvalidValueError } from "../errors";

/** Peso corporal em kg, com precisão de 0.1kg (resolução de balança comum). */
export class Weight {
  private constructor(readonly kg: number) {}

  static fromKg(kg: number): Weight {
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
      throw new InvalidValueError(`Peso corporal inválido: ${kg}kg`);
    }
    return new Weight(Math.round(kg * 10) / 10);
  }

  /** Delta em kg em relação a outro peso (negativo = perdeu peso). */
  deltaFrom(previous: Weight): number {
    return Math.round((this.kg - previous.kg) * 10) / 10;
  }

  equals(other: Weight): boolean {
    return this.kg === other.kg;
  }
}
