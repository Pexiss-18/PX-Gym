import { gerarComReserva, type ProvedorIA } from "../ia/provedor.ts";
import { ACERVO, type Artigo } from "./acervo.ts";
import { EXERCICIO_POR_ID } from "./exercicios.ts";
import {
  type Avaliacao,
  type Dieta,
  esquemaParaIA,
  type Perfil,
  planoDaIASchema,
} from "./esquema.ts";
import { dadosDoPedido, instrucoesDoSistema, type Revisao } from "./prompt.ts";
import {
  ajustarDieta,
  ajustarTreino,
  exerciciosVetados,
  juntarAlimentos,
  type Treino,
} from "./regras.ts";

export type PlanoGerado = {
  nutrition: Dieta;
  workout: Treino;
  /** Ids do acervo que embasaram o plano. */
  sources: string[];
  /** O que as regras corrigiram na dieta proposta pela IA. */
  ajustes: string[];
  /** O que o pedido de mudança ensinou; vai pro perfil e vale nos próximos planos. */
  preferencias: { exerciciosIndisponiveis: string[]; alimentosQueNaoGosta: string[] };
  modelo: string;
};

/**
 * Pede treino e dieta num único pedido à IA e passa a resposta pelas regras.
 * Com `revisao`, a IA parte do plano atual e muda só o que o usuário pediu.
 * Uma resposta que as regras rejeitam conta como falha do modelo, e o
 * próximo da lista é tentado.
 */
export async function gerarPlano(
  provedores: ProvedorIA[],
  avaliacao: Avaliacao,
  perfil: Perfil,
  opcoes: { revisao?: Revisao; acervo?: Artigo[] } = {},
): Promise<PlanoGerado> {
  const { revisao, acervo = ACERVO } = opcoes;
  const idsDoAcervo = new Set(acervo.map((artigo) => artigo.id));
  const vetados = exerciciosVetados(perfil);

  const { valor, modelo } = await gerarComReserva(
    provedores,
    {
      sistema: instrucoesDoSistema(acervo, vetados),
      entrada: dadosDoPedido(avaliacao, perfil, revisao),
      esquema: esquemaParaIA(vetados),
    },
    (json) => {
      const bruto = planoDaIASchema.parse(json);

      // Preferência nova só nasce de um pedido de mudança.
      const exerciciosNovos = revisao
        ? [...new Set(bruto.preferences.unavailableExerciseIds)].filter(
            (id) => EXERCICIO_POR_ID.has(id) && !perfil.exerciciosIndisponiveis.includes(id),
          )
        : [];
      const alimentosNovos = revisao
        ? juntarAlimentos(bruto.preferences.dislikedFoods).filter(
            (alimento) => !juntarAlimentos(perfil.alimentosQueNaoGosta).includes(alimento),
          )
        : [];

      const { dieta, ajustes } = ajustarDieta(bruto.nutrition, avaliacao.weightKg, perfil);
      return {
        nutrition: dieta,
        workout: ajustarTreino(bruto.workout, perfil, [...vetados, ...exerciciosNovos]),
        sources: [...new Set(bruto.sources)].filter((id) => idsDoAcervo.has(id)),
        ajustes,
        preferencias: {
          exerciciosIndisponiveis: exerciciosNovos,
          alimentosQueNaoGosta: alimentosNovos,
        },
      };
    },
  );

  return { ...valor, modelo };
}
