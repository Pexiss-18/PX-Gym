import { EXERCICIO_POR_ID, EXERCICIOS } from "./exercicios.ts";
import type { Dieta, Perfil, TreinoDaIA } from "./esquema.ts";

/** A IA devolveu um plano que não dá pra consertar: vale tentar outro modelo. */
export class PlanoInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "PlanoInvalido";
  }
}

const AJUSTE_POR_OBJETIVO: Record<Perfil["objetivo"], number> = {
  emagrecimento: -0.2,
  hipertrofia: 0.1,
  forca: 0.05,
  condicionamento: 0,
  saude: 0,
};

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo);
}

/**
 * Os modelos menores às vezes soltam caracteres de outro alfabeto no meio
 * do texto; aqui só passa escrita latina, números, pontuação e símbolos.
 */
export function limparTexto(texto: string): string {
  return texto
    .replace(/[^\p{Script=Latin}\p{N}\p{P}\p{S}\p{Zs}\n]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Taxa metabólica basal por Mifflin-St Jeor. */
export function taxaMetabolicaBasal(pesoKg: number, perfil: Perfil): number {
  const base = 10 * pesoKg + 6.25 * perfil.alturaCm - 5 * perfil.idade;
  return base + (perfil.sexo === "masculino" ? 5 : -161);
}

/** Meta calórica de referência: gasto diário estimado, ajustado pelo objetivo. */
export function caloriasDeReferencia(pesoKg: number, perfil: Perfil): number {
  const fatorDeAtividade =
    perfil.diasPorSemana <= 3 ? 1.375 : perfil.diasPorSemana <= 5 ? 1.55 : 1.725;
  const gasto = taxaMetabolicaBasal(pesoKg, perfil) * fatorDeAtividade;
  return gasto * (1 + AJUSTE_POR_OBJETIVO[perfil.objetivo]);
}

/**
 * A IA propõe, a fórmula confere: calorias ficam a até 15% da referência (e
 * nunca abaixo da taxa basal), proteína entre 1,4 e 2,4 g/kg, gordura entre
 * 0,6 e 1,2 g/kg, e o carboidrato fecha a conta. `ajustes` lista o que mudou.
 */
export function ajustarDieta(
  dieta: Dieta,
  pesoKg: number,
  perfil: Perfil,
): { dieta: Dieta; ajustes: string[] } {
  const ajustes: string[] = [];
  const referencia = caloriasDeReferencia(pesoKg, perfil);
  const piso = Math.max(taxaMetabolicaBasal(pesoKg, perfil), referencia * 0.85);

  const calorias = Math.round(limitar(dieta.caloriesTarget, piso, referencia * 1.15));
  const proteina = Math.round(limitar(dieta.macros.protein.grams, 1.4 * pesoKg, 2.4 * pesoKg));
  const gordura = Math.round(limitar(dieta.macros.fat.grams, 0.6 * pesoKg, 1.2 * pesoKg));
  const carboidrato = Math.max(0, Math.round((calorias - proteina * 4 - gordura * 9) / 4));

  const conferir = (rotulo: string, original: number, final: number, unidade: string) => {
    if (Math.abs(original - final) > 1) {
      ajustes.push(`${rotulo}: ${Math.round(original)} → ${final} ${unidade}`);
    }
  };
  conferir("calorias", dieta.caloriesTarget, calorias, "kcal");
  conferir("proteína", dieta.macros.protein.grams, proteina, "g");
  conferir("gordura", dieta.macros.fat.grams, gordura, "g");
  conferir("carboidrato", dieta.macros.carbs.grams, carboidrato, "g");

  return {
    dieta: {
      caloriesTarget: calorias,
      macros: {
        protein: { grams: proteina, rationale: limparTexto(dieta.macros.protein.rationale) },
        carbs: { grams: carboidrato, rationale: limparTexto(dieta.macros.carbs.rationale) },
        fat: { grams: gordura, rationale: limparTexto(dieta.macros.fat.rationale) },
      },
      micros: dieta.micros.map((micro) => ({
        ...micro,
        name: limparTexto(micro.name),
        rationale: limparTexto(micro.rationale),
      })),
      dietGuidance: limparTexto(dieta.dietGuidance),
    },
    ajustes,
  };
}

export type ExercicioDoPlano = {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: number;
  restSeconds: number;
  notes: string;
};

export type DiaDeTreino = {
  label: string;
  name: string;
  focus: string;
  estimatedMinutes: number;
  exercises: ExercicioDoPlano[];
};

export type Treino = { name: string; rationale: string; days: DiaDeTreino[] };

const MINIMO_DE_EXERCICIOS_POR_DIA = 3;

/**
 * O que não pode entrar no treino dessa pessoa: o que a academia dela não
 * tem e o que sobrecarrega uma região que ela marcou como sensível.
 */
export function exerciciosVetados(perfil: Perfil): string[] {
  const porRegiao = EXERCICIOS.filter((exercicio) =>
    perfil.regioesSensiveis.some((regiao) => exercicio.atencao?.includes(regiao))
  ).map((exercicio) => exercicio.id);
  return [...new Set([...perfil.exerciciosIndisponiveis, ...porRegiao])];
}

/**
 * Confere o treino contra o catálogo e o perfil: um dia por dia pedido,
 * exercícios existentes, fora dos vetados e sem repetição, séries/repetições/descanso em faixas sãs. Nome e grupo
 * muscular vêm do catálogo, não da IA.
 */
export function ajustarTreino(
  treino: TreinoDaIA,
  perfil: Perfil,
  vetados: string[] = exerciciosVetados(perfil),
): Treino {
  if (treino.days.length !== perfil.diasPorSemana) {
    throw new PlanoInvalido(
      `O treino veio com ${treino.days.length} dias; o pedido era de ${perfil.diasPorSemana}`,
    );
  }

  const days = treino.days.map((dia, indice): DiaDeTreino => {
    const vistos = new Set<string>(vetados);
    const exercises: ExercicioDoPlano[] = [];
    for (const item of dia.exercises) {
      const doCatalogo = EXERCICIO_POR_ID.get(item.exerciseId);
      if (!doCatalogo || vistos.has(doCatalogo.id)) continue;
      vistos.add(doCatalogo.id);
      exercises.push({
        exerciseId: doCatalogo.id,
        name: doCatalogo.nome,
        muscleGroup: doCatalogo.grupo,
        sets: Math.round(limitar(item.sets, 1, 6)),
        reps: Math.round(limitar(item.reps, 3, 60)),
        restSeconds: Math.round(limitar(item.restSeconds, 30, 300)),
        notes: limparTexto(item.notes),
      });
    }
    if (exercises.length < MINIMO_DE_EXERCICIOS_POR_DIA) {
      throw new PlanoInvalido(`O dia ${indice + 1} ficou com ${exercises.length} exercício(s) válidos`);
    }
    return {
      label: `Treino ${String.fromCharCode(65 + indice)}`,
      name: limparTexto(dia.name),
      focus: limparTexto(dia.focus),
      estimatedMinutes: Math.round(limitar(dia.estimatedMinutes, 15, 150)),
      exercises,
    };
  });

  return { name: limparTexto(treino.name), rationale: limparTexto(treino.rationale), days };
}

const MAXIMO_DE_ALIMENTOS = 30;

/** Normaliza e junta listas de alimentos, sem repetir. */
export function juntarAlimentos(...listas: string[][]): string[] {
  const vistos = new Set<string>();
  for (const alimento of listas.flat()) {
    const limpo = limparTexto(alimento).toLowerCase().slice(0, 40);
    if (limpo) vistos.add(limpo);
  }
  return [...vistos].slice(0, MAXIMO_DE_ALIMENTOS);
}
