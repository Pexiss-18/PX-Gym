import { InvalidValueError } from "../errors";

export type MacroKey = "protein" | "carbs" | "fat";

const KCAL_PER_GRAM: Record<MacroKey, number> = {
  protein: 4,
  carbs: 4,
  fat: 9,
};

/** Quantidade de um macronutriente em gramas, com a densidade calórica fixa do nutriente. */
export class Macro {
  private constructor(
    readonly key: MacroKey,
    readonly grams: number,
  ) {}

  static of(key: MacroKey, grams: number): Macro {
    if (!Number.isFinite(grams) || grams < 0 || grams > 2000) {
      throw new InvalidValueError(`Quantidade inválida de ${key}: ${grams}g`);
    }
    return new Macro(key, Math.round(grams));
  }

  get kcal(): number {
    return this.grams * KCAL_PER_GRAM[this.key];
  }

  /** Fração consumida em relação a uma meta (0..1, saturado em 1). */
  progressTowards(target: Macro): number {
    if (target.key !== this.key) {
      throw new InvalidValueError(
        `Comparando macros diferentes: ${this.key} vs ${target.key}`,
      );
    }
    if (target.grams === 0) return 1;
    return Math.min(1, this.grams / target.grams);
  }

  add(grams: number): Macro {
    return Macro.of(this.key, this.grams + grams);
  }
}
