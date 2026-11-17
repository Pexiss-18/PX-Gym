import { EXERCICIO_POR_ID, EXERCICIOS } from "./exercicios.ts";
import type { Dieta, OpcaoConferida, Perfil, Refeicao, RefeicaoConferida, TreinoDaIA } from "./esquema.ts";

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
/** Faixas que a fórmula aceita; vão pra IA mirar e servem pra conferir. */
export function faixasDaDieta(pesoKg: number, perfil: Perfil) {
  const referencia = caloriasDeReferencia(pesoKg, perfil);
  return {
    calorias: [Math.max(taxaMetabolicaBasal(pesoKg, perfil), referencia * 0.85), referencia * 1.15],
    proteina: [1.4 * pesoKg, 2.4 * pesoKg],
    gordura: [0.6 * pesoKg, 1.2 * pesoKg],
  } as const;
}

/** Dieta depois da fórmula: metas conferidas e refeições com totais calculados. */
export type DietaConferida = Omit<Dieta, "meals"> & { meals: RefeicaoConferida[] };

const kcalDe = (p: number, c: number, g: number) => p * 4 + c * 4 + g * 9;
const umaCasa = (n: number) => Math.round(n * 10) / 10;

/** 1,5 → "1,5"; 4 → "4". */
const virgula = (n: number) => String(n).replace(".", ",");

/** Medida caseira refeita a partir dos gramas finais, em meias unidades. */
export function medidaCaseira(
  gramas: number,
  alimento: { unit: string; unitPlural: string; unitGrams: number },
): string {
  const unidade = limparTexto(alimento.unit);
  if (!(alimento.unitGrams > 0) || !unidade) return "";
  const quantas = Math.round((gramas / alimento.unitGrams) * 2) / 2;
  if (quantas < 0.5 || quantas > 20) return "";
  const plural = limparTexto(alimento.unitPlural) || unidade;
  return `${virgula(quantas)} ${quantas > 1 ? plural : unidade}`;
}

type MacrosDoAlimento = { protein: number; carbs: number; fat: number };

/**
 * Quanto escalar cada alimento de uma opção. Com meta de proteína, separa os
 * alimentos ricos em proteína (≥40% das calorias, ex.: frango, ovo, carne)
 * do resto e resolve o sistema 2×2 que acerta calorias e proteína juntas:
 *   a·Pp + b·Pr = proteína   e   a·Kp + b·Kr = calorias
 * Solução fora de 0,4×–3× (porção absurda) ou opção sem os dois grupos:
 * escala única, que acerta só as calorias.
 */
export function fatoresDaOpcao(
  alimentos: MacrosDoAlimento[],
  kcalAlvo: number,
  proteinaAlvo?: number,
): number[] {
  const kcal = (a: MacrosDoAlimento) => kcalDe(a.protein, a.carbs, a.fat);
  const total = alimentos.reduce((s, a) => s + kcal(a), 0);
  const unico = alimentos.map(() => kcalAlvo / total);
  if (proteinaAlvo === undefined) return unico;

  const proteico = alimentos.map((a) => kcal(a) > 0 && (a.protein * 4) / kcal(a) >= 0.4);
  const soma = (grupo: boolean, f: (a: MacrosDoAlimento) => number) =>
    alimentos.reduce((s, a, i) => (proteico[i] === grupo ? s + f(a) : s), 0);
  const [Pp, Kp] = [soma(true, (a) => a.protein), soma(true, kcal)];
  const [Pr, Kr] = [soma(false, (a) => a.protein), soma(false, kcal)];
  const det = Pp * Kr - Pr * Kp;
  if (Kp === 0 || Kr === 0 || Math.abs(det) < 1e-9) return unico;

  const a = (proteinaAlvo * Kr - Pr * kcalAlvo) / det;
  const b = (Pp * kcalAlvo - proteinaAlvo * Kp) / det;
  const razoavel = (f: number) => f >= 0.4 && f <= 3;
  if (!razoavel(a) || !razoavel(b)) return unico;
  return proteico.map((p) => (p ? a : b));
}

/**
 * A IA escolhe os alimentos e quanto cada refeição pesa no dia; a fórmula
 * calcula as porções. As calorias de cada opção saem dos macros dos
 * alimentos (a IA erra a conta), e cada opção é escalada pra meta da sua
 * refeição: qualquer combinação de opções fecha o dia na meta.
 */
export function conferirRefeicoes(
  refeicoes: Refeicao[],
  calorias: number,
  /** Meta de proteína do dia; sem ela, só as calorias são acertadas. */
  proteina?: number,
): { refeicoes: RefeicaoConferida[]; ajuste: string | null } {
  type Alimento = Refeicao["options"][number]["foods"][number];
  const kcalDaOpcao = (alimentos: Alimento[]) =>
    alimentos.reduce((total, a) => total + kcalDe(a.protein, a.carbs, a.fat), 0);

  const limpas = refeicoes
    .slice(0, 6)
    .map((refeicao) => ({
      name: limparTexto(refeicao.name),
      options: refeicao.options
        .slice(0, 4)
        .map((opcao) => opcao.foods.filter((a) => a.grams > 0))
        .filter((alimentos) => kcalDaOpcao(alimentos) > 0),
    }))
    .filter((refeicao) => refeicao.options.length > 0);

  const pesoDa = (refeicao: (typeof limpas)[number]) =>
    refeicao.options.reduce((s, o) => s + kcalDaOpcao(o), 0) / refeicao.options.length;
  const dia = limpas.reduce((total, refeicao) => total + pesoDa(refeicao), 0);
  if (dia <= 0) return { refeicoes: [], ajuste: null };

  // A proteína se divide como a IA dividiu (almoço e jantar costumam levar
  // mais), não na proporção das calorias.
  const proteinaDa = (refeicao: (typeof limpas)[number]) =>
    refeicao.options.reduce((s, o) => s + o.reduce((t, a) => t + a.protein, 0), 0) /
    refeicao.options.length;
  const proteinaDoDia = limpas.reduce((total, refeicao) => total + proteinaDa(refeicao), 0);

  const conferidas = limpas.map((refeicao) => {
    const meta = (calorias * pesoDa(refeicao)) / dia;
    const metaDeProteina = proteina === undefined || proteinaDoDia <= 0
      ? undefined
      : (proteina * proteinaDa(refeicao)) / proteinaDoDia;
    return {
      name: refeicao.name,
      options: refeicao.options.map((alimentos): OpcaoConferida => {
        const fatores = fatoresDaOpcao(alimentos, meta, metaDeProteina);
        const foods = alimentos.map((a, i) => {
          const grams = Math.max(5, Math.round((a.grams * fatores[i]) / 5) * 5);
          const proporcao = grams / a.grams;
          return {
            name: limparTexto(a.name),
            grams,
            measure: medidaCaseira(grams, a),
            protein: umaCasa(a.protein * proporcao),
            carbs: umaCasa(a.carbs * proporcao),
            fat: umaCasa(a.fat * proporcao),
          };
        });
        const protein = umaCasa(foods.reduce((s, a) => s + a.protein, 0));
        const carbs = umaCasa(foods.reduce((s, a) => s + a.carbs, 0));
        const fat = umaCasa(foods.reduce((s, a) => s + a.fat, 0));
        return { kcal: Math.round(kcalDe(protein, carbs, fat)), protein, carbs, fat, foods };
      }),
    };
  });

  const fator = calorias / dia;
  return {
    refeicoes: conferidas,
    ajuste: Math.abs(fator - 1) > 0.1
      ? `porções: refeições somavam ${Math.round(dia)} kcal, escaladas ×${fator.toFixed(2)} pra fechar ${calorias} kcal`
      : null,
  };
}

export function ajustarDieta(
  dieta: Dieta,
  pesoKg: number,
  perfil: Perfil,
): { dieta: DietaConferida; ajustes: string[] } {
  const ajustes: string[] = [];
  const faixas = faixasDaDieta(pesoKg, perfil);

  const calorias = Math.round(limitar(dieta.caloriesTarget, faixas.calorias[0], faixas.calorias[1]));
  const proteina = Math.round(limitar(dieta.macros.protein.grams, faixas.proteina[0], faixas.proteina[1]));
  const gordura = Math.round(limitar(dieta.macros.fat.grams, faixas.gordura[0], faixas.gordura[1]));
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

  const refeicoes = conferirRefeicoes(dieta.meals, calorias, proteina);
  if (refeicoes.ajuste) ajustes.push(refeicoes.ajuste);

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
      meals: refeicoes.refeicoes,
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
