import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { ErroDeCota, type ProvedorIA } from "../ia/provedor.ts";
import { EXERCICIOS } from "./exercicios.ts";
import {
  esquemaParaIA,
  type Perfil,
  perfilDoBanco,
  perfilSchema,
  type PlanoDaIA,
} from "./esquema.ts";
import { gerarPlano } from "./gerar-plano.ts";
import { dadosDoPedido, instrucoesDoSistema } from "./prompt.ts";
import {
  ajustarDieta,
  ajustarTreino,
  caloriasDeReferencia,
  exerciciosVetados,
  juntarAlimentos,
  limparTexto,
  PlanoInvalido,
  taxaMetabolicaBasal,
} from "./regras.ts";

const PERFIL: Perfil = perfilSchema.parse({
  objetivo: "hipertrofia",
  diasPorSemana: 3,
  nivel: "intermediario",
  sexo: "masculino",
  idade: 25,
  alturaCm: 180,
});

const AVALIACAO = { weightKg: 80, bodyFatPct: 18, muscleMassKg: 38, measurements: [] };

function dia(ids: string[]) {
  return {
    name: "Dia",
    focus: "Hipertrofia",
    estimatedMinutes: 60,
    exercises: ids.map((exerciseId) => ({
      exerciseId,
      sets: 3,
      reps: 10,
      restSeconds: 90,
      notes: "",
    })),
  };
}

// 160 g de proteína, 80 g de gordura e 385 g de carboidrato = 2900 kcal.
function planoDaIA(mudancas: Partial<PlanoDaIA> = {}): PlanoDaIA {
  return {
    nutrition: {
      caloriesTarget: 2900,
      macros: {
        protein: { grams: 160, rationale: "p" },
        carbs: { grams: 385, rationale: "c" },
        fat: { grams: 80, rationale: "g" },
      },
      micros: [{ name: "Ferro", targetAmount: 8, unit: "mg", rationale: "r" }],
      dietGuidance: "Coma bem.",
    },
    workout: {
      name: "ABC",
      rationale: "Divisão em três.",
      days: [
        dia(["supino-reto", "crucifixo-cabo", "triceps-corda"]),
        dia(["puxada-frontal", "remada-baixa", "rosca-direta"]),
        dia(["agachamento-livre", "leg-press", "mesa-flexora"]),
      ],
    },
    sources: [],
    preferences: { unavailableExerciseIds: [], dislikedFoods: [] },
    ...mudancas,
  };
}

Deno.test("catálogo: ids únicos e em formato de slug", () => {
  const ids = EXERCICIOS.map((exercicio) => exercicio.id);
  assertEquals(new Set(ids).size, ids.length);
  for (const id of ids) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id), id);
});

Deno.test("esquema: o id do exercício é um enum do catálogo, sem $schema", () => {
  // deno-lint-ignore no-explicit-any
  const esquema = esquemaParaIA() as any;
  assertEquals(esquema.$schema, undefined);
  assertEquals(
    esquema.properties.workout.properties.days.items.properties.exercises.items.properties
      .exerciseId.enum,
    EXERCICIOS.map((exercicio) => exercicio.id),
  );
});

Deno.test("perfil: recusa dias e idade fora da faixa, preenche os padrões", () => {
  assertEquals(PERFIL.minutosPorSessao, 60);
  assertEquals(PERFIL.restricoes, "");
  assert(!perfilSchema.safeParse({ ...PERFIL, diasPorSemana: 7 }).success);
  assert(!perfilSchema.safeParse({ ...PERFIL, idade: 10 }).success);
});

Deno.test("regras: Mifflin-St Jeor e referência por objetivo", () => {
  // 10*80 + 6.25*180 - 5*25 + 5 = 1805
  assertEquals(taxaMetabolicaBasal(80, PERFIL), 1805);
  assertEquals(taxaMetabolicaBasal(80, { ...PERFIL, sexo: "feminino" }), 1639);
  // 1805 * 1.375 * 1.10
  assertEquals(Math.round(caloriasDeReferencia(80, PERFIL)), 2730);
  // 1805 * 1.55 * 0.80
  assertEquals(
    Math.round(
      caloriasDeReferencia(80, { ...PERFIL, objetivo: "emagrecimento", diasPorSemana: 5 }),
    ),
    2238,
  );
});

Deno.test("dieta: proposta dentro da faixa passa sem ajuste e fecha as calorias", () => {
  const { dieta, ajustes } = ajustarDieta(planoDaIA().nutrition, 80, PERFIL);
  assertEquals(ajustes, []);
  assertEquals(dieta.caloriesTarget, 2900);
  const { protein, carbs, fat } = dieta.macros;
  assert(Math.abs(protein.grams * 4 + carbs.grams * 4 + fat.grams * 9 - 2900) <= 4);
});

Deno.test("dieta: proposta absurda é trazida pra faixa e o ajuste é relatado", () => {
  const proposta = planoDaIA().nutrition;
  proposta.caloriesTarget = 900;
  proposta.macros.protein.grams = 400;
  proposta.macros.fat.grams = 10;

  const { dieta, ajustes } = ajustarDieta(proposta, 80, PERFIL);

  // piso = max(taxa basal 1805, 85% de 2730,06 = 2321)
  assertEquals(dieta.caloriesTarget, 2321);
  assertEquals(dieta.macros.protein.grams, 192); // 2,4 g/kg
  assertEquals(dieta.macros.fat.grams, 48); // 0,6 g/kg
  assertEquals(dieta.macros.carbs.grams, Math.round((2321 - 192 * 4 - 48 * 9) / 4));
  assertEquals(ajustes.length, 4);
  assertEquals(ajustes[0], "calorias: 900 → 2321 kcal");
  assertEquals(dieta.macros.protein.rationale, "p");
});

Deno.test("dieta: emagrecimento nunca desce abaixo da taxa basal", () => {
  const proposta = planoDaIA().nutrition;
  proposta.caloriesTarget = 1000;
  const { dieta } = ajustarDieta(proposta, 80, { ...PERFIL, objetivo: "emagrecimento" });
  // referência 1805 * 1.375 * 0.8 = 1986; 85% disso = 1688, abaixo da basal
  assertEquals(dieta.caloriesTarget, 1805);
});

Deno.test("treino: nome e grupo vêm do catálogo; rótulos A, B, C; faixas aplicadas", () => {
  const bruto = planoDaIA().workout;
  bruto.days[0].exercises[0] = {
    exerciseId: "supino-reto",
    sets: 12,
    reps: 1,
    restSeconds: 5,
    notes: "  cotovelos a 45 graus  ",
  };

  const treino = ajustarTreino(bruto, PERFIL);

  assertEquals(treino.days.map((d) => d.label), ["Treino A", "Treino B", "Treino C"]);
  assertEquals(treino.days[0].exercises[0], {
    exerciseId: "supino-reto",
    name: "Supino reto com barra",
    muscleGroup: "Peito",
    sets: 6,
    reps: 3,
    restSeconds: 30,
    notes: "cotovelos a 45 graus",
  });
});

Deno.test("treino: exercício inventado ou repetido é descartado", () => {
  const bruto = planoDaIA().workout;
  bruto.days[0] = dia([
    "supino-reto",
    "supino-reto",
    "voador-invertido-lunar",
    "peck-deck",
    "triceps-testa",
  ]);
  const treino = ajustarTreino(bruto, PERFIL);
  assertEquals(
    treino.days[0].exercises.map((e) => e.exerciseId),
    ["supino-reto", "peck-deck", "triceps-testa"],
  );
});

Deno.test("treino: número de dias errado ou dia quase vazio é inválido", () => {
  assertThrows(
    () => ajustarTreino(planoDaIA().workout, { ...PERFIL, diasPorSemana: 4 }),
    PlanoInvalido,
    "3 dias",
  );
  const bruto = planoDaIA().workout;
  bruto.days[1] = dia(["puxada-frontal", "inexistente", "outro-inexistente"]);
  assertThrows(() => ajustarTreino(bruto, PERFIL), PlanoInvalido, "dia 2");
});

Deno.test("prompt: leva o catálogo e o acervo; os dados não levam identidade", () => {
  const semAcervo = instrucoesDoSistema([]);
  assert(semAcervo.includes("supino-reto | Supino reto com barra | Peito | barra | ombro"));
  assert(semAcervo.includes("peck-deck | Peck deck | Peito | maquina | -"));
  assert(!instrucoesDoSistema([], ["peck-deck"]).includes("peck-deck |"));
  assert(semAcervo.includes("ainda vazio"));

  const comAcervo = instrucoesDoSistema([
    { id: "art-1", titulo: "Volume", referencia: "Ref 2020", temas: ["treino"], resumo: "Dez séries." },
  ]);
  assert(comAcervo.includes("[art-1] Volume — Ref 2020"));
  assert(comAcervo.includes("Dez séries."));

  const dados = JSON.parse(dadosDoPedido(AVALIACAO, PERFIL));
  assertEquals(Object.keys(dados), ["avaliacao", "perfil"]);
  assertEquals(dados.avaliacao.pesoKg, 80);
  assertEquals(dados.perfil.restricoes, "nenhuma");
});

Deno.test("gerarPlano: plano inválido cai pro reserva; fontes fora do acervo somem", async () => {
  const invalido = planoDaIA();
  invalido.workout.days.pop();
  const provedores: ProvedorIA[] = [
    { modelo: "principal", gerar: () => Promise.resolve(invalido) },
    {
      modelo: "reserva",
      gerar: () => Promise.resolve(planoDaIA({ sources: ["art-1", "inventado", "art-1"] })),
    },
  ];

  const plano = await gerarPlano(provedores, AVALIACAO, PERFIL, {
    acervo: [{ id: "art-1", titulo: "t", referencia: "r", temas: ["treino"], resumo: "x" }],
  });

  assertEquals(plano.modelo, "reserva");
  assertEquals(plano.sources, ["art-1"]);
  assertEquals(plano.workout.days.length, 3);
  assertEquals(plano.nutrition.caloriesTarget, 2900);
});

Deno.test("gerarPlano: resposta fora do formato e cota esgotada propagam o erro certo", async () => {
  await assertRejects(() =>
    gerarPlano([{ modelo: "m", gerar: () => Promise.resolve({ nada: true }) }], AVALIACAO, PERFIL)
  );
  await assertRejects(
    () =>
      gerarPlano(
        [{ modelo: "m", gerar: () => Promise.reject(new ErroDeCota("m")) }],
        AVALIACAO,
        PERFIL,
      ),
    ErroDeCota,
  );
});

Deno.test("perfil do banco: idade sai da data de nascimento, no dia do pedido", () => {
  const row = {
    sex: "feminino",
    birth_date: "2000-10-14",
    height_cm: "165.0",
    goal: "emagrecimento",
    level: "iniciante",
    days_per_week: 3,
    minutes_per_session: 45,
    restrictions: "",
    sensitive_regions: ["joelho"],
    unavailable_exercises: ["leg-press"],
    disliked_foods: ["ovo"],
  };
  const vespera = perfilDoBanco(row, new Date("2026-10-13T12:00:00Z"));
  assertEquals(vespera.idade, 25);
  assertEquals(perfilDoBanco(row, new Date("2026-10-14T12:00:00Z")).idade, 26);
  assertEquals(vespera.alturaCm, 165);
  assertEquals(vespera.exerciciosIndisponiveis, ["leg-press"]);
  assertEquals(vespera.alimentosQueNaoGosta, ["ovo"]);
});

Deno.test("indisponíveis: somem do enum enviado à IA e são filtrados do treino", () => {
  // deno-lint-ignore no-explicit-any
  const esquema = esquemaParaIA(["leg-press"]) as any;
  const ids = esquema.properties.workout.properties.days.items.properties.exercises.items
    .properties.exerciseId.enum as string[];
  assert(!ids.includes("leg-press"));
  assert(ids.includes("agachamento-hack"));
  assert(esquema.properties.preferences.properties.unavailableExerciseIds.items.enum.includes("leg-press"));

  const bruto = planoDaIA().workout;
  bruto.days[2] = dia(["agachamento-livre", "leg-press", "mesa-flexora", "cadeira-extensora"]);
  const treino = ajustarTreino(bruto, { ...PERFIL, exerciciosIndisponiveis: ["leg-press"] });
  assertEquals(
    treino.days[2].exercises.map((e) => e.exerciseId),
    ["agachamento-livre", "mesa-flexora", "cadeira-extensora"],
  );
});

Deno.test("texto: caracteres de outro alfabeto são removidos; acentos e símbolos ficam", () => {
  assertEquals(limparTexto("AB的上 - Superior/Inferior"), "AB - Superior/Inferior");
  assertEquals(limparTexto("  Leg press 45° — 3×10 (até a falha)  "), "Leg press 45° — 3×10 (até a falha)");
  const treino = ajustarTreino({ ...planoDaIA().workout, name: "ABC ру Força" }, PERFIL);
  assertEquals(treino.name, "ABC Força");
});

Deno.test("alimentos: normaliza, junta e não repete", () => {
  assertEquals(juntarAlimentos(["Ovo", " fígado "], ["ovo", "", "Jiló"]), ["ovo", "fígado", "jiló"]);
});

Deno.test("mudança: o plano atual e o pedido vão à IA; o que ela aprende volta filtrado", async () => {
  const atual = await gerarPlano(
    [{ modelo: "m", gerar: () => Promise.resolve(planoDaIA()) }],
    AVALIACAO,
    PERFIL,
  );
  assertEquals(atual.preferencias, { exerciciosIndisponiveis: [], alimentosQueNaoGosta: [] });

  const pedidos: string[] = [];
  const revisado = planoDaIA({
    preferences: {
      unavailableExerciseIds: ["leg-press", "leg-press", "aparelho-que-nao-existe"],
      dislikedFoods: ["Ovo", "jiló"],
    },
  });
  // A IA listou o leg press como indisponível mas esqueceu de tirá-lo do dia.
  revisado.workout.days[2] = dia(["agachamento-livre", "leg-press", "mesa-flexora", "afundo"]);

  const plano = await gerarPlano(
    [{
      modelo: "m",
      gerar: (pedido) => {
        pedidos.push(pedido.entrada);
        return Promise.resolve(revisado);
      },
    }],
    AVALIACAO,
    { ...PERFIL, alimentosQueNaoGosta: ["ovo"] },
    { revisao: { planoAtual: atual, pedido: "não tem leg press e não como jiló" } },
  );

  const enviado = JSON.parse(pedidos[0]);
  assertEquals(enviado.pedidoDeMudanca, "não tem leg press e não como jiló");
  assertEquals(enviado.planoAtual.workout.days[0].exercises[0], {
    exerciseId: "supino-reto",
    sets: 3,
    reps: 10,
    restSeconds: 90,
    notes: "",
  });
  assertEquals(enviado.perfil.alimentosQueNaoGosta, ["ovo"]);

  assertEquals(plano.preferencias, {
    exerciciosIndisponiveis: ["leg-press"],
    alimentosQueNaoGosta: ["jiló"],
  });
  assertEquals(
    plano.workout.days[2].exercises.map((e) => e.exerciseId),
    ["agachamento-livre", "mesa-flexora", "afundo"],
  );
});

Deno.test("sem pedido de mudança, preferências devolvidas pela IA são ignoradas", async () => {
  const plano = await gerarPlano(
    [{
      modelo: "m",
      gerar: () =>
        Promise.resolve(
          planoDaIA({ preferences: { unavailableExerciseIds: ["leg-press"], dislikedFoods: ["ovo"] } }),
        ),
    }],
    AVALIACAO,
    PERFIL,
  );
  assertEquals(plano.preferencias, { exerciciosIndisponiveis: [], alimentosQueNaoGosta: [] });
  assert(plano.workout.days[2].exercises.some((e) => e.exerciseId === "leg-press"));
});

Deno.test("regiões sensíveis: o que sobrecarrega a região é vetado junto dos indisponíveis", () => {
  const perfil: Perfil = { ...PERFIL, regioesSensiveis: ["ombro"], exerciciosIndisponiveis: ["leg-press"] };
  const vetados = exerciciosVetados(perfil);
  for (const id of ["desenvolvimento-maquina", "puxada-frontal", "supino-reto", "leg-press"]) {
    assert(vetados.includes(id), id);
  }
  for (const id of ["supino-reto-halteres", "remada-baixa", "elevacao-lateral"]) {
    assert(!vetados.includes(id), id);
  }
  assertEquals(exerciciosVetados(PERFIL), []);

  const bruto = planoDaIA().workout;
  bruto.days[0] = dia(["supino-reto", "desenvolvimento-maquina", "peck-deck", "crucifixo-cabo", "triceps-corda"]);
  bruto.days[1] = dia(["remada-baixa", "remada-maquina", "rosca-direta"]);
  bruto.days[2] = dia(["agachamento-hack", "leg-press", "mesa-flexora", "cadeira-flexora"]);
  const treino = ajustarTreino(bruto, perfil);
  assertEquals(
    treino.days[0].exercises.map((e) => e.exerciseId),
    ["peck-deck", "crucifixo-cabo", "triceps-corda"],
  );
  assert(!instrucoesDoSistema([], vetados).includes("desenvolvimento-maquina |"));
});
