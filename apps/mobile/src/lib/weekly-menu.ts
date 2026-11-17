import type { Meal, MealOption } from "@px/core";

export const DIAS_DA_SEMANA = [
  { nome: "Segunda", curto: "Seg" },
  { nome: "Terça", curto: "Ter" },
  { nome: "Quarta", curto: "Qua" },
  { nome: "Quinta", curto: "Qui" },
  { nome: "Sexta", curto: "Sex" },
  { nome: "Sábado", curto: "Sáb" },
  { nome: "Domingo", curto: "Dom" },
] as const;

/** Índice do dia de hoje com a semana começando na segunda (0 = segunda). */
export function diaDeHoje(agora: Date = new Date()): number {
  return (agora.getDay() + 6) % 7;
}

/**
 * Qual opção de cada refeição vai em cada dia: as refeições andam juntas
 * mas defasadas (dia + refeição), então dias seguidos não repetem a mesma
 * combinação. Com 4 opções, segunda volta na sexta.
 */
export function opcaoDoDia(dia: number, refeicao: number, quantasOpcoes: number): number {
  return quantasOpcoes > 0 ? (dia + refeicao) % quantasOpcoes : 0;
}

export type RefeicaoDoDia = { meal: Meal; optionIndex: number; option: MealOption };

/**
 * Cardápio de um dia. `trocas` guarda o que a pessoa trocou na mão
 * ("refeição" → índice da opção) e vale por cima do rodízio.
 */
export function cardapioDoDia(
  meals: Meal[],
  dia: number,
  trocas: Record<number, number> = {},
): RefeicaoDoDia[] {
  return meals
    .filter((meal) => meal.options.length > 0)
    .map((meal, i) => {
      const optionIndex = (trocas[i] ?? opcaoDoDia(dia, i, meal.options.length)) % meal.options.length;
      return { meal, optionIndex, option: meal.options[optionIndex]! };
    });
}

/** Soma do dia: com a fórmula igualando as opções, fica na meta. */
export function totalDoDia(refeicoes: RefeicaoDoDia[]) {
  const soma = (chave: "kcal" | "protein" | "carbs" | "fat") =>
    refeicoes.reduce((total, r) => total + r.option[chave], 0);
  return {
    kcal: Math.round(soma("kcal")),
    protein: Math.round(soma("protein")),
    carbs: Math.round(soma("carbs")),
    fat: Math.round(soma("fat")),
  };
}
