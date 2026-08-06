import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  extractedAssessmentSchema,
  nutritionPlanResultSchema,
  type ExtractedAssessment,
  type NutritionPlanResult,
} from "@/lib/schemas/assessment";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

function toInputSchema(schema: z.ZodType): Anthropic.Tool["input_schema"] {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json as Anthropic.Tool["input_schema"];
}

function firstToolUse(response: Anthropic.Message) {
  const block = response.content.find((entry) => entry.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("A IA não retornou os dados no formato esperado.");
  }
  return block.input;
}

export async function extractBodyAssessment(pdfBase64: string): Promise<ExtractedAssessment> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system:
      "Você é um assistente que extrai dados estruturados de laudos de avaliação física/corporal em português. " +
      "Extraia apenas o que estiver explicitamente no documento; deixe campos nulos quando não encontrar o dado. " +
      "Nunca invente valores.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          { type: "text", text: "Extraia os dados desta avaliação corporal." },
        ],
      },
    ],
    tools: [
      {
        name: "record_body_assessment",
        description: "Registra os dados extraídos da avaliação corporal.",
        input_schema: toInputSchema(extractedAssessmentSchema),
      },
    ],
    tool_choice: { type: "tool", name: "record_body_assessment" },
  });

  return extractedAssessmentSchema.parse(firstToolUse(response));
}

export async function generateNutritionPlan(
  data: ExtractedAssessment,
  context: { goal: string },
): Promise<NutritionPlanResult> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system:
      "Você é um assistente de nutrição. A partir dos dados de uma avaliação corporal, defina uma meta diária de " +
      "calorias, macronutrientes (proteína, carboidrato e gordura em gramas) e os micronutrientes mais relevantes " +
      "para essa pessoa, cada um com uma breve justificativa. Baseie-se em diretrizes nutricionais estabelecidas. " +
      "Deixe claro que é uma sugestão inicial, não um diagnóstico ou prescrição médica.",
    messages: [
      {
        role: "user",
        content:
          `Dados da avaliação corporal (JSON):\n${JSON.stringify(data, null, 2)}\n\n` +
          `Objetivo da pessoa: ${context.goal}.\n\n` +
          "Gere a meta diária de macros e micros e uma orientação de dieta curta.",
      },
    ],
    tools: [
      {
        name: "record_nutrition_plan",
        description: "Registra a meta diária de calorias, macros e micros sugerida.",
        input_schema: toInputSchema(nutritionPlanResultSchema),
      },
    ],
    tool_choice: { type: "tool", name: "record_nutrition_plan" },
  });

  return nutritionPlanResultSchema.parse(firstToolUse(response));
}
