/**
 * Chamadas de verdade ao Gemini com uma avaliação de exemplo, sem banco nem
 * deploy — pra conferir a chave, a cota e a cara do plano:
 *
 *   npm run try:plan                          gera o treino e a dieta
 *   npm run try:plan -- "não tenho leg press" gera e depois pede essa mudança no treino
 *
 * Lê GEMINI_API_KEY (e GEMINI_MODELS, opcional) de supabase/functions/.env.
 * Cada geração (treino ou dieta) gasta um pedido da cota diária.
 */
import { provedoresGemini } from "../ia/gemini.ts";
import { perfilSchema } from "./esquema.ts";
import { gerarDieta, gerarTreino } from "./gerar-plano.ts";

const chave = Deno.env.get("GEMINI_API_KEY");
if (!chave) {
  console.error("Falta GEMINI_API_KEY em supabase/functions/.env");
  Deno.exit(1);
}

const provedores = provedoresGemini(chave, Deno.env.get("GEMINI_MODELS"));
const avaliacao = { weightKg: 82, bodyFatPct: 19, muscleMassKg: 37, measurements: [] };
const perfil = perfilSchema.parse({
  objetivo: "hipertrofia",
  diasPorSemana: 4,
  nivel: "intermediario",
  sexo: "masculino",
  idade: 24,
  alturaCm: 178,
  restricoes: "desconforto no ombro direito em exercícios acima da cabeça",
  regioesSensiveis: ["ombro"],
});

const treino = await gerarTreino(provedores, avaliacao, perfil);
const dieta = await gerarDieta(provedores, avaliacao, perfil);
const saida: Record<string, unknown> = { treino, dieta };

const pedido = Deno.args[0];
if (pedido) {
  saida.pedido = pedido;
  saida.treinoRevisado = await gerarTreino(provedores, avaliacao, perfil, {
    revisao: { atual: treino.workout, pedido },
  });
}

console.log(JSON.stringify(saida, null, 2));
