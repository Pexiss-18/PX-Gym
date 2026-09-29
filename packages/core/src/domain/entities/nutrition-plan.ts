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

/** Conteúdo gerado pela IA, antes de virar um plano persistido. */
export type NutritionPlanDraft = {
  caloriesTarget: number;
  macros: { protein: MacroTarget; carbs: MacroTarget; fat: MacroTarget };
  micros: MicroTarget[];
  dietGuidance: string;
  model: string;
};

export type NutritionPlan = NutritionPlanDraft & {
  id: string;
  assessmentId: string;
  userId: string;
  createdAt: Date;
};
