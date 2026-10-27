import { z } from "zod";
import { EXERCICIOS } from "./exercicios.ts";

export const REGIOES = ["ombro", "lombar", "joelho", "cotovelo", "punho"] as const;

/** O perfil do usuário, como a geração do plano o enxerga. */
export const perfilSchema = z.object({
  objetivo: z.enum(["hipertrofia", "emagrecimento", "forca", "condicionamento", "saude"]),
  diasPorSemana: z.number().int().min(2).max(6),
  nivel: z.enum(["iniciante", "intermediario", "avancado"]),
  sexo: z.enum(["masculino", "feminino"]),
  idade: z.number().int().min(14).max(90),
  alturaCm: z.number().min(120).max(230),
  minutosPorSessao: z.number().int().min(20).max(120).default(60),
  /** Lesões e limitações, em texto livre. */
  restricoes: z.string().trim().max(500).default(""),
  /** Regiões com dor ou lesão: exercício que as sobrecarrega não entra. */
  regioesSensiveis: z.array(z.enum(REGIOES)).default([]),
  /** Ids do catálogo que a academia do usuário não tem. */
  exerciciosIndisponiveis: z.array(z.string()).default([]),
  alimentosQueNaoGosta: z.array(z.string()).default([]),
});

export type Perfil = z.infer<typeof perfilSchema>;

/** Linha de user_profiles. */
export type PerfilRow = {
  sex: string;
  birth_date: string;
  height_cm: number | string;
  goal: string;
  level: string;
  days_per_week: number;
  minutes_per_session: number;
  restrictions: string;
  sensitive_regions: string[];
  unavailable_exercises: string[];
  disliked_foods: string[];
};

function idadeEm(nascimento: string, hoje: Date): number {
  const [ano, mes, dia] = nascimento.split("-").map(Number);
  const jaFezAniversario =
    hoje.getUTCMonth() + 1 > mes || (hoje.getUTCMonth() + 1 === mes && hoje.getUTCDate() >= dia);
  return hoje.getUTCFullYear() - ano - (jaFezAniversario ? 0 : 1);
}

/** O perfil guarda a data de nascimento; a idade é calculada a cada pedido. */
export function perfilDoBanco(row: PerfilRow, hoje: Date): Perfil {
  return perfilSchema.parse({
    objetivo: row.goal,
    diasPorSemana: row.days_per_week,
    nivel: row.level,
    sexo: row.sex,
    idade: idadeEm(row.birth_date, hoje),
    alturaCm: Number(row.height_cm),
    minutosPorSessao: row.minutes_per_session,
    restricoes: row.restrictions,
    regioesSensiveis: row.sensitive_regions,
    exerciciosIndisponiveis: row.unavailable_exercises,
    alimentosQueNaoGosta: row.disliked_foods,
  });
}

/** Espelha ExtractedAssessment do @px/core (o Deno não importa o workspace). */
export const avaliacaoSchema = z.object({
  weightKg: z.number().positive(),
  bodyFatPct: z.number().nullable().default(null),
  muscleMassKg: z.number().nullable().default(null),
  measurements: z
    .array(z.object({ label: z.string(), valueCm: z.number() }))
    .default([]),
});

export type Avaliacao = z.infer<typeof avaliacaoSchema>;

const macroSchema = z.object({
  grams: z.number().describe("Meta diária em gramas"),
  rationale: z.string().describe("Breve justificativa desta meta"),
});

/** Mesmo formato já gravado em nutrition_plans (NutritionPlanDraft do core). */
export const dietaSchema = z.object({
  caloriesTarget: z.number().describe("Meta diária de calorias (kcal)"),
  macros: z.object({ protein: macroSchema, carbs: macroSchema, fat: macroSchema }),
  micros: z
    .array(
      z.object({
        name: z.string().describe("Nome do micronutriente, ex: Ferro, Vitamina D"),
        targetAmount: z.number().describe("Meta diária"),
        unit: z.string().describe("Unidade, ex: mg, mcg, UI"),
        rationale: z.string().describe("Por que é relevante para essa pessoa"),
      }),
    )
    .describe("De 3 a 6 micronutrientes mais relevantes para essa pessoa"),
  dietGuidance: z
    .string()
    .describe("Orientação de dieta específica para essa pessoa, de 3 a 5 frases, em português"),
});

export type Dieta = z.infer<typeof dietaSchema>;

export const treinoSchema = z.object({
  name: z.string().describe("Nome do plano, ex: ABC — Hipertrofia"),
  rationale: z.string().describe("Por que essa divisão e esse volume servem a essa pessoa"),
  days: z.array(
    z.object({
      name: z.string().describe("Ex: Peito e Tríceps"),
      focus: z.string().describe("Ex: Força e hipertrofia"),
      estimatedMinutes: z.number().describe("Duração estimada da sessão"),
      exercises: z.array(
        z.object({
          exerciseId: z.string().describe("Id do exercício no catálogo"),
          sets: z.number().describe("Número de séries"),
          reps: z.number().describe("Repetições alvo por série"),
          restSeconds: z.number().describe("Descanso entre séries, em segundos"),
          notes: z.string().describe("Dica curta de execução ou adaptação; pode ser vazia"),
        }),
      ),
    }),
  ),
});

export type TreinoDaIA = z.infer<typeof treinoSchema>;

export const planoDaIASchema = z.object({
  nutrition: dietaSchema,
  workout: treinoSchema,
  sources: z.array(z.string()).describe("Ids dos artigos do acervo usados; vazio se nenhum"),
  preferences: z
    .object({
      unavailableExerciseIds: z
        .array(z.string())
        .describe("Exercícios que o usuário disse não ter como fazer na academia dele"),
      dislikedFoods: z
        .array(z.string())
        .describe("Alimentos que o usuário disse não gostar ou não comer, no singular"),
    })
    .describe("Só o que o pedido de mudança declara; listas vazias se não houver pedido"),
});

export type PlanoDaIA = z.infer<typeof planoDaIASchema>;

/**
 * JSON Schema enviado ao provedor. O id do exercício vira enum do catálogo
 * sem os vetados (ver exerciciosVetados): o modelo fica impedido de inventar
 * exercício ou de usar um que o usuário não pode fazer, e o que ainda
 * escapar é filtrado em ajustarTreino.
 */
export function esquemaParaIA(vetados: string[] = []): Record<string, unknown> {
  const todos = EXERCICIOS.map((exercicio) => exercicio.id);
  // deno-lint-ignore no-explicit-any
  const json = z.toJSONSchema(planoDaIASchema) as any;
  delete json.$schema;
  json.properties.workout.properties.days.items.properties.exercises.items.properties
    .exerciseId.enum = todos.filter((id) => !vetados.includes(id));
  json.properties.preferences.properties.unavailableExerciseIds.items.enum = todos;
  return json;
}
