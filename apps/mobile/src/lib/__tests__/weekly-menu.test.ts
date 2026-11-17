import type { Meal } from "@px/core";
import { cardapioDoDia, diaDeHoje, opcaoDoDia, totalDoDia } from "../weekly-menu";

const opcao = (kcal: number, nome: string) => ({
  kcal, protein: 30, carbs: 50, fat: 10,
  foods: [{ name: nome, grams: 100, measure: "", protein: 30, carbs: 50, fat: 10 }],
});
const MEALS: Meal[] = [
  { name: "Café", options: [opcao(500, "ovo"), opcao(500, "aveia"), opcao(500, "pão"), opcao(500, "tapioca")] },
  { name: "Almoço", options: [opcao(800, "frango"), opcao(800, "carne"), opcao(800, "peixe")] },
];

describe("cardápio da semana", () => {
  it("segunda começa no índice 0; domingo é 6", () => {
    expect(diaDeHoje(new Date(2026, 10, 16))).toBe(0); // segunda
    expect(diaDeHoje(new Date(2026, 10, 22))).toBe(6); // domingo
  });

  it("dias seguidos trocam as opções e refeições andam defasadas", () => {
    expect(opcaoDoDia(0, 0, 4)).toBe(0);
    expect(opcaoDoDia(1, 0, 4)).toBe(1);
    expect(opcaoDoDia(0, 1, 3)).toBe(1);
    expect(opcaoDoDia(4, 0, 4)).toBe(0);
    const segunda = cardapioDoDia(MEALS, 0).map((r) => r.option.foods[0]!.name);
    const terca = cardapioDoDia(MEALS, 1).map((r) => r.option.foods[0]!.name);
    expect(segunda).toEqual(["ovo", "carne"]);
    expect(terca).toEqual(["aveia", "peixe"]);
  });

  it("troca feita na mão vale por cima do rodízio", () => {
    const dia = cardapioDoDia(MEALS, 0, { 1: 2 });
    expect(dia[1]!.option.foods[0]!.name).toBe("peixe");
  });

  it("total do dia soma a opção escolhida de cada refeição", () => {
    expect(totalDoDia(cardapioDoDia(MEALS, 0))).toEqual({ kcal: 1300, protein: 60, carbs: 100, fat: 20 });
  });
});
