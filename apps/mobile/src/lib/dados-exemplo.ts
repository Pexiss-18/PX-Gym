import * as Crypto from "expo-crypto";
import { like, ne, and } from "drizzle-orm";
import { db } from "@/db";
import { setLogs } from "@/db/schema";
import { todayWorkout } from "./mock-data";
import { supabase } from "./supabase";
import { todayIsoDate, trySyncSetLogs } from "./workout";

/*
 * Dados de exemplo para demonstração (prints, apresentações). Só aparece em
 * desenvolvimento (__DEV__), nunca no APK.
 *
 * Os dois lados do app recebem dados: as séries vão para o SQLite do aparelho
 * (é de lá que saem progressão de carga, sequência e faixa semanal; o Supabase
 * só recebe cópia pelo sync) e as avaliações + plano de dieta vão direto para
 * o Supabase, que é de onde essas telas leem.
 *
 * Tudo leva uma marca para poder ser removido sem tocar no resto: o id das
 * séries começa com PREFIXO e o pdf_path das avaliações com "exemplo/".
 */

const PREFIXO = "e0e0e0e0";
const PDF_EXEMPLO = "exemplo/";

const idDeExemplo = () => `${PREFIXO}${Crypto.randomUUID().slice(8)}`;

/** Data local (AAAA-MM-DD) de N dias atrás, no mesmo formato do RegisterSet. */
function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Arredonda para o passo de carga (2,5 kg na barra/polia, 2 kg em halteres). */
function arredondar(kg: number, passo: number): number {
  return Math.round(kg / passo) * passo;
}

// Treino A a cada 3–4 dias por 8 semanas, e os 4 últimos dias seguidos
// (sequência de 5 dias contando com hoje).
const SESSOES = [56, 52, 49, 45, 42, 38, 35, 31, 28, 24, 21, 17, 14, 10, 7, 4, 3, 2, 1];

function seriesDeExemplo() {
  const linhas: (typeof setLogs.$inferInsert)[] = [];

  for (const exercicio of todayWorkout.exercises) {
    const passo = exercicio.id.includes("halteres") || exercicio.id.includes("frances") ? 2 : 2.5;
    const anterior = new Map<number, number>();

    SESSOES.forEach((dias, k) => {
      const data = diasAtras(dias);
      const progresso = k / (SESSOES.length - 1);
      for (const serie of exercicio.sets) {
        // Começa ~18% abaixo e chega na carga "anterior" do plano de hoje.
        const inicio = serie.previousLoadKg * 0.82;
        const carga = arredondar(inicio + (serie.previousLoadKg - inicio) * progresso, passo);
        linhas.push({
          id: idDeExemplo(),
          sessionDate: data,
          exerciseId: exercicio.id,
          exerciseName: exercicio.name,
          setNumber: serie.setNumber,
          targetReps: serie.targetReps,
          previousLoadKg: anterior.get(serie.setNumber) ?? carga,
          loadKg: carga,
          completedAt: new Date(`${data}T07:${String(10 + serie.setNumber * 3).padStart(2, "0")}:00`),
          syncStatus: "pending",
        });
        anterior.set(serie.setNumber, carga);
      }
    });
  }

  // Hoje: supino reto completo e duas séries do inclinado, com a carga do plano.
  const hoje = todayIsoDate();
  const agora = Date.now();
  for (const exercicio of todayWorkout.exercises.slice(0, 2)) {
    const series = exercicio.id === "supino-reto" ? exercicio.sets : exercicio.sets.slice(0, 2);
    for (const serie of series) {
      linhas.push({
        id: idDeExemplo(),
        sessionDate: hoje,
        exerciseId: exercicio.id,
        exerciseName: exercicio.name,
        setNumber: serie.setNumber,
        targetReps: serie.targetReps,
        previousLoadKg: serie.previousLoadKg,
        loadKg: serie.targetLoadKg,
        completedAt: new Date(agora - (20 - serie.setNumber) * 60_000),
        syncStatus: "pending",
      });
    }
  }
  return linhas;
}

// Quatro avaliações mensais: peso e gordura caindo, massa magra subindo.
const AVALIACOES = [
  { dias: 92, peso: 86.4, gordura: 23.8, musculo: 35.1, cintura: 94, peito: 104, braco: 35, coxa: 58 },
  { dias: 61, peso: 84.9, gordura: 22.1, musculo: 35.6, cintura: 92, peito: 104.5, braco: 35.5, coxa: 58.5 },
  { dias: 31, peso: 83.1, gordura: 20.6, musculo: 36.0, cintura: 90, peito: 105.5, braco: 36, coxa: 59 },
  { dias: 3, peso: 81.6, gordura: 19.2, musculo: 36.5, cintura: 88, peito: 106, braco: 36.5, coxa: 59.5 },
];

async function avaliacoesDeExemplo(userId: string): Promise<void> {
  let ultimaId = "";
  for (const [i, a] of AVALIACOES.entries()) {
    const id = Crypto.randomUUID();
    const criadaEm = new Date();
    criadaEm.setDate(criadaEm.getDate() - a.dias);
    const { error } = await supabase.from("body_assessments").insert({
      id,
      user_id: userId,
      pdf_path: `${PDF_EXEMPLO}${userId}/avaliacao-${i + 1}.pdf`,
      status: "reviewed",
      extracted_data: {
        weightKg: a.peso,
        bodyFatPct: a.gordura,
        muscleMassKg: a.musculo,
        measurements: [
          { label: "Cintura", valueCm: a.cintura },
          { label: "Peito", valueCm: a.peito },
          { label: "Braço", valueCm: a.braco },
          { label: "Coxa", valueCm: a.coxa },
        ],
        assessmentDate: diasAtras(a.dias),
        notes: null,
      },
      error_message: null,
      created_at: criadaEm.toISOString(),
    });
    if (error) throw error;
    ultimaId = id;
  }

  const { error } = await supabase.from("nutrition_plans").insert({
    id: Crypto.randomUUID(),
    assessment_id: ultimaId,
    user_id: userId,
    calories_target: 2450,
    macros: {
      protein: { grams: 165, rationale: "2 g/kg para preservar e ganhar massa magra no déficit leve." },
      carbs: { grams: 275, rationale: "Concentrado antes e depois do treino para render nas séries." },
      fat: { grams: 75, rationale: "Cerca de 0,9 g/kg, mantendo a produção hormonal." },
    },
    micros: [
      { name: "Fibras", targetAmount: 30, unit: "g", rationale: "Saciedade e saúde intestinal." },
      { name: "Cálcio", targetAmount: 1000, unit: "mg", rationale: "Saúde óssea com treino de força." },
      { name: "Vitamina D", targetAmount: 15, unit: "mcg", rationale: "Função muscular e imunidade." },
    ],
    diet_guidance:
      "Distribua a proteína em 4 refeições de 35 a 45 g. Priorize arroz, batata e aveia perto do treino, e frutas, legumes e verduras no restante do dia. Beba cerca de 3 litros de água.",
    model: "exemplo",
    created_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export type ResultadoExemplo = { series: number; nuvem: "ok" | "falhou"; mensagem?: string };

/** Grava as séries no aparelho e as avaliações/dieta no Supabase. */
export async function carregarDadosDeExemplo(userId: string): Promise<ResultadoExemplo> {
  await removerDadosDeExemplo(userId);
  const linhas = seriesDeExemplo();
  // Em lotes: o SQLite limita a quantidade de parâmetros por comando.
  for (let i = 0; i < linhas.length; i += 50) {
    await db.insert(setLogs).values(linhas.slice(i, i + 50));
  }
  try {
    await avaliacoesDeExemplo(userId);
    void trySyncSetLogs(userId);
    return { series: linhas.length, nuvem: "ok" };
  } catch (e) {
    return { series: linhas.length, nuvem: "falhou", mensagem: e instanceof Error ? e.message : String(e) };
  }
}

/** Remove só o que tem a marca de exemplo, aqui e na nuvem. */
export async function removerDadosDeExemplo(userId: string): Promise<void> {
  // Vira tombstone: o sync apaga a cópia do Supabase e depois limpa o aparelho.
  await db
    .update(setLogs)
    .set({ syncStatus: "deleted" })
    .where(and(like(setLogs.id, `${PREFIXO}%`), ne(setLogs.syncStatus, "deleted")));
  void trySyncSetLogs(userId);
  // Os planos de dieta saem junto, pela cascata da chave estrangeira.
  await supabase
    .from("body_assessments")
    .delete()
    .eq("user_id", userId)
    .like("pdf_path", `${PDF_EXEMPLO}%`);
}
