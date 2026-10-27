/**
 * Gera src/lib/guia-exercicios.dados.ts — passo a passo, músculos e nível de
 * cada exercício do catálogo, tirados do exercicios-bd-ptbr (CC0, domínio
 * público): https://github.com/gugeldev/exercicios-bd-ptbr
 *
 * Só o texto vem de lá. As imagens do dataset original não têm licença
 * (foram copiadas de sites de terceiros), então ficam de fora.
 *
 * Uso (de apps/mobile):
 *   node scripts/gerar-guia-exercicios.mjs [caminho do exercises-ptbr-full-translation.json]
 * Sem caminho, baixa o JSON do GitHub.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const URL_DATASET =
  "https://raw.githubusercontent.com/gugeldev/exercicios-bd-ptbr/main/exercises/exercises-ptbr-full-translation.json";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(aqui, "../src/lib/guia-exercicios.dados.ts");

/** id do catálogo (supabase/functions/_shared/plano/exercicios.ts) → id no dataset. */
const MAPA = {
  "supino-reto": "Barbell_Bench_Press_-_Medium_Grip",
  "supino-reto-halteres": "Dumbbell_Bench_Press",
  "supino-inclinado-barra": "Barbell_Incline_Bench_Press_-_Medium_Grip",
  "supino-inclinado-halteres": "Incline_Dumbbell_Press",
  "supino-maquina": "Machine_Bench_Press",
  "crucifixo-halteres": "Dumbbell_Flyes",
  "crucifixo-cabo": "Cable_Crossover",
  "peck-deck": "Butterfly",
  "flexao-de-bracos": "Pushups",
  "barra-fixa": "Pullups",
  "puxada-frontal": "Wide-Grip_Lat_Pulldown",
  "puxada-triangulo": "V-Bar_Pulldown",
  "remada-curvada": "Bent_Over_Barbell_Row",
  "remada-unilateral-halter": "One-Arm_Dumbbell_Row",
  "remada-baixa": "Seated_Cable_Rows",
  "remada-maquina": "Leverage_Iso_Row",
  "pulldown-braco-reto": "Straight-Arm_Pulldown",
  "levantamento-terra": "Barbell_Deadlift",
  "desenvolvimento-barra": "Seated_Barbell_Military_Press",
  "desenvolvimento-halteres": "Dumbbell_Shoulder_Press",
  "desenvolvimento-maquina": "Machine_Shoulder_Military_Press",
  "elevacao-lateral": "Side_Lateral_Raise",
  "elevacao-lateral-cabo": "Cable_Seated_Lateral_Raise",
  "elevacao-frontal": "Front_Dumbbell_Raise",
  "crucifixo-inverso": "Reverse_Flyes",
  "face-pull": "Face_Pull",
  "encolhimento-halteres": "Dumbbell_Shrug",
  "rosca-direta": "Barbell_Curl",
  "rosca-alternada": "Dumbbell_Alternate_Bicep_Curl",
  "rosca-martelo": "Hammer_Curls",
  "rosca-scott": "Machine_Preacher_Curls",
  "rosca-cabo": "Standing_Biceps_Cable_Curl",
  "triceps-corda": "Triceps_Pushdown_-_Rope_Attachment",
  "triceps-barra-polia": "Triceps_Pushdown",
  "triceps-frances": "Standing_Dumbbell_Triceps_Extension",
  "triceps-testa": "EZ-Bar_Skullcrusher",
  "mergulho-paralelas": "Dips_-_Triceps_Version",
  "agachamento-livre": "Barbell_Full_Squat",
  "agachamento-goblet": "Goblet_Squat",
  "agachamento-hack": "Hack_Squat",
  "leg-press": "Leg_Press",
  "cadeira-extensora": "Leg_Extensions",
  afundo: "Dumbbell_Lunges",
  "agachamento-bulgaro": "Split_Squat_with_Dumbbells",
  stiff: "Stiff-Legged_Barbell_Deadlift",
  "levantamento-terra-romeno": "Romanian_Deadlift",
  "mesa-flexora": "Lying_Leg_Curls",
  "cadeira-flexora": "Seated_Leg_Curl",
  "elevacao-pelvica": "Barbell_Hip_Thrust",
  "gluteo-cabo": "One-Legged_Cable_Kickback",
  "cadeira-abdutora": "Thigh_Abductor",
  "cadeira-adutora": "Thigh_Adductor",
  "panturrilha-em-pe": "Standing_Calf_Raises",
  "panturrilha-sentado": "Seated_Calf_Raise",
  prancha: "Plank",
  "abdominal-supra": "Crunches",
  "abdominal-infra": "Flat_Bench_Lying_Leg_Raise",
  "abdominal-cabo": "Cable_Crunch",
};

/**
 * Passos reescritos à mão: o exercício do dataset usa outro equipamento ou
 * outra variação, ou o texto veio curto demais.
 */
const PASSOS_PROPRIOS = {
  // dataset: versão sentada e inclinada (que trabalha deltoide posterior)
  "elevacao-lateral-cabo": [
    "Fique de lado para uma polia baixa e segure a alça com a mão mais distante dela; o cabo passa na frente do corpo.",
    "Com o tronco reto e o cotovelo levemente flexionado, deixe a mão perto do quadril. Esta é a posição inicial.",
    "Eleve o braço para o lado até a altura do ombro, sem balançar o tronco, expirando. Segure por um segundo.",
    "Desça devagar até a posição inicial, inspirando, e troque de lado ao terminar a série.",
  ],
  // dataset: um passo só
  "face-pull": [
    "Prenda uma corda na polia na altura do rosto e segure as pontas com as palmas voltadas uma para a outra.",
    "Dê um ou dois passos para trás até os braços ficarem estendidos e o cabo tensionado. Esta é a posição inicial.",
    "Puxe a corda em direção ao rosto, separando as mãos e levando os cotovelos para trás e para fora, na altura dos ombros. Expire e contraia as escápulas.",
    "Volte devagar à posição inicial, inspirando.",
  ],
  // dataset: com kettlebell
  "agachamento-goblet": [
    "Fique em pé com os pés um pouco mais afastados que os ombros, segurando um halter na vertical junto ao peito, com as duas mãos sob a cabeça do halter. Esta é a posição inicial.",
    "Agache entre as pernas, levando o quadril para trás e para baixo, com o peito erguido e as costas retas. Inspire ao descer.",
    "No ponto mais baixo, use os cotovelos para empurrar os joelhos levemente para fora.",
    "Empurre o chão com os pés inteiros e volte à posição inicial, expirando.",
  ],
  // dataset: com barra
  "levantamento-terra-romeno": [
    "Fique em pé com os pés na largura do quadril, segurando um halter em cada mão na frente das coxas, palmas voltadas para você.",
    "Flexione levemente os joelhos e mantenha-os assim durante todo o movimento. Esta é a posição inicial.",
    "Leve o quadril para trás e desça os halteres rente às pernas, com as costas retas, até sentir o alongamento atrás das coxas. Inspire ao descer.",
    "Empurre o quadril para a frente e volte à posição em pé, contraindo os glúteos, expirando.",
  ],
};

/** Correções pontuais no texto do dataset: [id, trecho original, substituto]. */
const CORRECOES = [
  ["supino-maquina", "Trague as alças", "Traga as alças"],
  ["supino-inclinado-barra", "recoloca a barra", "recoloque a barra"],
  [
    "flexao-de-bracos",
    "com as mãos afastadas cerca de 90 cm",
    "com as mãos um pouco mais afastadas que a largura dos ombros",
  ],
  [
    "desenvolvimento-barra",
    "Sente-se em um banco de desenvolvimento militar com a barra atrás da cabeça. Peça a um assistente para passar a barra (melhor para os ombros) ou segure-a com cuidado, com as palmas",
    "Sente-se em um banco com encosto, com a barra no suporte à sua frente. Segure-a com as palmas",
  ],
  ["mesa-flexora", "na cadeira flexora", "na mesa flexora"],
  [
    "agachamento-bulgaro",
    "Posicione-se em um afundo com o pé traseiro elevado e o pé dianteiro à frente.",
    "Apoie o peito do pé de trás em um banco e dê um passo largo à frente com a outra perna.",
  ],
  // a regra do joelho que não passa da ponta do pé é mito; sai a nota
  [
    "afundo",
    " Nota: Não permita que o joelho da frente ultrapasse a linha dos dedos dos pés ao descer, para evitar estresse excessivo na articulação. Mantenha a canela da perna da frente perpendicular ao chão.",
    "",
  ],
  [
    "cadeira-extensora",
    "Para este exercício, você precisará usar uma máquina de extensão de pernas. Primeiro, escolha seu peso e sente-se",
    "Escolha o peso e sente-se",
  ],
  [
    "cadeira-extensora",
    " Dica: Ajuste a almofada para que fique sobre a parte inferior da perna (logo acima dos pés). Além disso, certifique-se de que as pernas formem um ângulo de 90 graus entre a parte inferior e superior. Se o ângulo for menor que 90 graus, isso significa que o joelho está sobre os dedos, o que cria estresse indevido na articulação do joelho. Se a máquina for assim, procure outra ou apenas certifique-se de parar de descer quando atingir o ângulo de 90 graus.",
    " Dica: ajuste a almofada para que fique logo acima dos pés e o joelho alinhado com o eixo da máquina.",
  ],
  [
    "cadeira-extensora",
    ", garantindo que não ultrapasse o limite de 90 graus",
    "",
  ],
  ["triceps-testa", "segure a barra W", "segure a barra (reta ou W)"],
];

/** Passo que só diz "repita pelo número de repetições" não ensina nada na tela. */
const SO_REPITA =
  /^(repita|execute)\b[^.]*\b(repeti[çc][õo]es|vezes)\b[^.]*\.?$|^repita\.$/i;

const MUSCULOS = {
  abdominais: "Abdômen",
  abdutores: "Abdutores",
  adutores: "Adutores",
  antebracos: "Antebraços",
  biceps: "Bíceps",
  dorsais: "Dorsais",
  gluteos: "Glúteos",
  "inferior-das-costas": "Lombar",
  isquiotibiais: "Posteriores de coxa",
  "meio-das-costas": "Meio das costas",
  ombros: "Ombros",
  panturrilhas: "Panturrilhas",
  peito: "Peito",
  quadriceps: "Quadríceps",
  trapezio: "Trapézio",
  triceps: "Tríceps",
};

const NIVEIS = new Set(["iniciante", "intermediario", "avancado"]);

async function lerDataset(caminho) {
  if (caminho) return JSON.parse(await readFile(caminho, "utf8"));
  const resposta = await fetch(URL_DATASET);
  if (!resposta.ok) throw new Error(`download falhou: ${resposta.status}`);
  return resposta.json();
}

function rotulo(musculo) {
  const r = MUSCULOS[musculo];
  if (!r) throw new Error(`músculo sem rótulo: ${musculo}`);
  return r;
}

const dataset = await lerDataset(process.argv[2]);
const porId = new Map(dataset.map((e) => [e.id, e]));

const guias = {};
for (const [id, ref] of Object.entries(MAPA)) {
  const e = porId.get(ref);
  if (!e) throw new Error(`${id}: ${ref} não existe no dataset`);
  if (!NIVEIS.has(e.level)) throw new Error(`${id}: nível ${e.level}`);

  let passos = PASSOS_PROPRIOS[id] ?? e.instructions;
  for (const [alvo, de, para] of CORRECOES) {
    if (alvo !== id) continue;
    const i = passos.findIndex((p) => p.includes(de));
    if (i < 0) throw new Error(`${id}: correção não encontrou "${de}"`);
    passos = passos.map((p, j) => (j === i ? p.replace(de, para) : p));
  }
  passos = passos.map((p) => p.trim()).filter((p) => !SO_REPITA.test(p));

  guias[id] = {
    ref,
    nivel: e.level,
    musculosPrimarios: e.primaryMuscles.map(rotulo),
    musculosSecundarios: e.secondaryMuscles.map(rotulo),
    passos,
  };
}

const corpo = Object.entries(guias)
  .map(([id, g]) => `  ${JSON.stringify(id)}: ${JSON.stringify(g, null, 2).replace(/\n/g, "\n  ")},`)
  .join("\n");

await writeFile(
  SAIDA,
  `// Gerado por scripts/gerar-guia-exercicios.mjs — não edite à mão.
// Texto: exercicios-bd-ptbr (CC0), https://github.com/gugeldev/exercicios-bd-ptbr
import type { GuiaExercicio } from "./guia-exercicios";

export const GUIAS: Record<string, GuiaExercicio> = {
${corpo}
};
`,
);
console.log(`${Object.keys(guias).length} guias em ${path.relative(process.cwd(), SAIDA)}`);
