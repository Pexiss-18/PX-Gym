export type MacroTarget = {
  grams: number;
  rationale: string;
};

export type MicroTarget = {
  name: string;
  targetAmount: number;
  unit: string;
  rationale: string;
};

export type MealFood = {
  name: string;
  grams: number;
  /** Medida caseira ("4 colheres de sopa"); vazia quando a fórmula escalou a porção. */
  measure: string;
  protein: number;
  carbs: number;
  fat: number;
};

/** Uma opção de refeição: totais calculados dos alimentos pela fórmula. */
export type MealOption = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  foods: MealFood[];
};

/** Refeição do dia com 2 ou 3 opções equivalentes; a pessoa escolhe uma. */
export type Meal = { name: string; options: MealOption[] };

/** Conteúdo gerado pela IA, antes de virar um plano persistido. */
export type NutritionPlanDraft = {
  caloriesTarget: number;
  macros: { protein: MacroTarget; carbs: MacroTarget; fat: MacroTarget };
  micros: MicroTarget[];
  dietGuidance: string;
  /** Opções de refeição pra bater as metas; vazio nas dietas antigas. */
  meals?: Meal[];
  model: string;
};

export type NutritionPlan = NutritionPlanDraft & {
  id: string;
  assessmentId: string;
  userId: string;
  createdAt: Date;
};
