import { gerarComReserva, type ProvedorIA } from "../ia/provedor.ts";
import { ACERVO, type Artigo } from "./acervo.ts";
import { EXERCICIO_POR_ID } from "./exercicios.ts";
import {
  type Avaliacao,
  type Dieta,
  esquemaParaIA,
  type Perfil,
  respostaDeDietaSchema,
  respostaDeTreinoSchema,
} from "./esquema.ts";
import {
  dadosDoPedido,
  instrucoesDoSistema,
  type RevisaoDeDieta,
  type RevisaoDeTreino,
} from "./prompt.ts";
import {
  ajustarDieta,
  ajustarTreino,
  exerciciosVetados,
  juntarAlimentos,
  type Treino,
} from "./regras.ts";

export type TreinoGerado = {
  workout: Treino;
  /** Ids do acervo que embasaram o treino. */
  sources: string[];
  /** O que o pedido de mudança ensinou; vai pro perfil e vale nos próximos planos. */
  preferencias: { exerciciosIndisponiveis: string[] };
  modelo: string;
};

export type DietaGerada = {
  nutrition: Dieta;
  /** Ids do acervo que embasaram a dieta. */
  sources: string[];
  /** O que as regras corrigiram na dieta proposta pela IA. */
  ajustes: string[];
  /** O que o pedido de mudança ensinou; vai pro perfil e vale nos próximos planos. */
  preferencias: { alimentosQueNaoGosta: string[] };
  modelo: string;
};

type Opcoes<R> = { revisao?: R; acervo?: Artigo[] };

/** Só fontes que existem no acervo e falam da parte pedida. */
function fontesValidas(fontes: string[], acervo: Artigo[], tema: Artigo["temas"][number]): string[] {
  const ids = new Set(acervo.filter((artigo) => artigo.temas.includes(tema)).map((a) => a.id));
  return [...new Set(fontes)].filter((id) => ids.has(id));
}

/**
 * Pede o treino à IA e passa a resposta pelas regras. Com `revisao`, a IA
 * parte do treino atual e muda só o que o usuário pediu. Uma resposta que as
 * regras rejeitam conta como falha do modelo, e o próximo da lista é tentado.
 */
export async function gerarTreino(
  provedores: ProvedorIA[],
  avaliacao: Avaliacao,
  perfil: Perfil,
  opcoes: Opcoes<RevisaoDeTreino> = {},
): Promise<TreinoGerado> {
  const { revisao, acervo = ACERVO } = opcoes;
  const vetados = exerciciosVetados(perfil);

  const { valor, modelo } = await gerarComReserva(
    provedores,
    {
      sistema: instrucoesDoSistema("treino", acervo, vetados),
      entrada: dadosDoPedido("treino", avaliacao, perfil, revisao),
      esquema: esquemaParaIA("treino", vetados),
    },
    (json) => {
      const bruto = respostaDeTreinoSchema.parse(json);
      // Preferência nova só nasce de um pedido de mudança.
      const exerciciosNovos = revisao
        ? [...new Set(bruto.preferences.unavailableExerciseIds)].filter(
          (id) => EXERCICIO_POR_ID.has(id) && !perfil.exerciciosIndisponiveis.includes(id),
        )
        : [];
      return {
        workout: ajustarTreino(bruto.workout, perfil, [...vetados, ...exerciciosNovos]),
        sources: fontesValidas(bruto.sources, acervo, "treino"),
        preferencias: { exerciciosIndisponiveis: exerciciosNovos },
      };
    },
  );

  return { ...valor, modelo };
}

/**
 * Pede a dieta à IA e passa a resposta pelas regras (calorias na faixa do
 * objetivo, macros fechando as calorias). Com `revisao`, a IA parte da dieta
 * atual e muda só o que o usuário pediu.
 */
export async function gerarDieta(
  provedores: ProvedorIA[],
  avaliacao: Avaliacao,
  perfil: Perfil,
  opcoes: Opcoes<RevisaoDeDieta> = {},
): Promise<DietaGerada> {
  const { revisao, acervo = ACERVO } = opcoes;

  const { valor, modelo } = await gerarComReserva(
    provedores,
    {
      sistema: instrucoesDoSistema("dieta", acervo),
      entrada: dadosDoPedido("dieta", avaliacao, perfil, revisao),
      esquema: esquemaParaIA("dieta"),
    },
    (json) => {
      const bruto = respostaDeDietaSchema.parse(json);
      const alimentosNovos = revisao
        ? juntarAlimentos(bruto.preferences.dislikedFoods).filter(
          (alimento) => !juntarAlimentos(perfil.alimentosQueNaoGosta).includes(alimento),
        )
        : [];
      const { dieta, ajustes } = ajustarDieta(bruto.nutrition, avaliacao.weightKg, perfil);
      return {
        nutrition: dieta,
        sources: fontesValidas(bruto.sources, acervo, "nutricao"),
        ajustes,
        preferencias: { alimentosQueNaoGosta: alimentosNovos },
      };
    },
  );

  return { ...valor, modelo };
}
