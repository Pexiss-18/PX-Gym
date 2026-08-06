import { z } from "zod";

export const measurementSchema = z.object({
  label: z.string().describe("Nome da medida, ex: Peito, Cintura, Quadril, Braço, Coxa"),
  valueCm: z.number().describe("Valor da medida em centímetros"),
});

export const extractedAssessmentSchema = z.object({
  weightKg: z.number().nullable().describe("Peso corporal em quilogramas"),
  bodyFatPct: z.number().nullable().describe("Percentual de gordura corporal"),
  muscleMassKg: z.number().nullable().describe("Massa muscular/magra em quilogramas"),
  measurements: z
    .array(measurementSchema)
    .describe("Medidas corporais encontradas no documento"),
  assessmentDate: z
    .string()
    .nullable()
    .describe("Data da avaliação no formato AAAA-MM-DD, se encontrada"),
  notes: z.string().nullable().describe("Observações relevantes do avaliador presentes no documento"),
});

export type ExtractedAssessment = z.infer<typeof extractedAssessmentSchema>;

export const macroTargetSchema = z.object({
  grams: z.number().describe("Meta diária em gramas"),
  rationale: z.string().describe("Breve justificativa desta meta"),
});

export const microTargetSchema = z.object({
  name: z.string().describe("Nome do micronutriente, ex: Ferro, Vitamina D, Cálcio"),
  targetAmount: z.number().describe("Meta diária"),
  unit: z.string().describe("Unidade, ex: mg, mcg, UI"),
  rationale: z.string().describe("Por que esse micronutriente é relevante para essa pessoa"),
});

export const nutritionPlanResultSchema = z.object({
  caloriesTarget: z.number().describe("Meta diária de calorias (kcal)"),
  macros: z.object({
    protein: macroTargetSchema,
    carbs: macroTargetSchema,
    fat: macroTargetSchema,
  }),
  micros: z
    .array(microTargetSchema)
    .describe("Micronutrientes mais relevantes para essa pessoa, com metas diárias"),
  dietGuidance: z
    .string()
    .describe("Orientação de dieta em texto corrido, curta e prática, em português"),
});

export type NutritionPlanResult = z.infer<typeof nutritionPlanResultSchema>;
