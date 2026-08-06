import { InvalidValueError } from "../errors";

/**
 * Carga de treino em kg. O incremento padrão de anilha é 2.5kg (o stepper do
 * app nunca usa teclado durante o treino), mas cargas fora da grade de 2.5
 * são válidas (halteres de 12kg, máquinas com placas próprias).
 */
export class Load {
  /** Incremento/decremento do stepper de série. */
  static readonly STEP_KG = 2.5;

  private constructor(readonly kg: number) {}

  static fromKg(kg: number): Load {
    if (!Number.isFinite(kg) || kg < 0 || kg > 1000) {
      throw new InvalidValueError(`Carga inválida: ${kg}kg`);
    }
    return new Load(Math.round(kg * 100) / 100);
  }

  static zero(): Load {
    return new Load(0);
  }

  increment(): Load {
    return Load.fromKg(Math.min(1000, this.kg + Load.STEP_KG));
  }

  decrement(): Load {
    return Load.fromKg(Math.max(0, this.kg - Load.STEP_KG));
  }

  /** Delta em kg (positivo = progressão de carga, o número que o app celebra). */
  deltaFrom(previous: Load): number {
    return Math.round((this.kg - previous.kg) * 100) / 100;
  }

  equals(other: Load): boolean {
    return this.kg === other.kg;
  }
}
