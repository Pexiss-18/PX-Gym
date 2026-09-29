import { Acompanhamento } from "../domain/entities/acompanhamento";
import { CicloAvaliacao } from "../domain/entities/ciclo-avaliacao";
import { TokenPersonal } from "../domain/entities/token-personal";
import { Assinatura } from "../domain/value-objects/assinatura";
import { Criterio } from "../domain/value-objects/criterio";
import type { UsuarioAutenticado } from "../domain/value-objects/sessao";
import { StatusSincronizacao } from "../domain/value-objects/status";

/*
 * Cenário padrão dos testes: um aluno, sua personal e a coordenação da
 * academia, com um ciclo de setembro/2026 em cada estado do ciclo de vida.
 */

export const ALUNO: UsuarioAutenticado = {
  id: "u-aluno",
  nome: "Paulo Rogério",
  email: "aluno@pxgym.dev",
  papel: "aluno",
};
export const PERSONAL: UsuarioAutenticado = {
  id: "u-personal",
  nome: "Carla Mendes",
  email: "personal@pxgym.dev",
  papel: "personal",
};
export const COORDENACAO: UsuarioAutenticado = {
  id: "u-coord",
  nome: "Coordenação Px",
  email: "coordenacao@pxgym.dev",
  papel: "coordenacao",
};
export const OUTRO_ALUNO: UsuarioAutenticado = {
  id: "u-outro",
  nome: "Outro Aluno",
  email: "outro@pxgym.dev",
  papel: "aluno",
};

/** Um SVG de assinatura de verdade, em base64. */
export const ASSINATURA_B64 =
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgMTIwIj48cGF0aCBkPSJNMTAgODAgQyA0MCAxMCwgNjUgMTAsIDk1IDgwIFMgMTUwIDE1MCwgMTgwIDgwIi8+PC9zdmc+";

export const AGORA = new Date("2026-09-29T12:00:00Z");

export function acompanhamentoPadrao(): Acompanhamento {
  return Acompanhamento.iniciar({
    id: "acomp-1",
    alunoId: ALUNO.id,
    alunoNome: ALUNO.nome,
    personalId: PERSONAL.id,
    personalNome: PERSONAL.nome,
    academia: "Px GYM Centro",
    inicio: "2026-08-01",
    fim: "2026-12-31",
  });
}

export function tokenPadrao(validadeHoras = 72): TokenPersonal {
  return TokenPersonal.emitir({
    token: "CARLA-2026",
    acompanhamentoId: "acomp-1",
    personalId: PERSONAL.id,
    personalNome: PERSONAL.nome,
    agora: AGORA,
    validadeHoras,
  });
}

export function cicloNovo(id = "ciclo-set"): CicloAvaliacao {
  return CicloAvaliacao.abrir({
    id,
    acompanhamentoId: "acomp-1",
    alunoId: ALUNO.id,
    personalId: PERSONAL.id,
    titulo: "Ciclo de setembro — Hipertrofia",
    inicio: "2026-09-01",
    fim: "2026-09-30",
    horasMinimas: 12,
    horasPeriodo: 40,
  });
}

const criterios = (notas: number[], nomes: string[]) =>
  nomes.map((n, i) => Criterio.criar(n, notas[i]!));

/** 4 treinos de 3h (= 12h, o mínimo) e as duas avaliações feitas. */
export function cicloProntoParaAssinar(id = "ciclo-set"): CicloAvaliacao {
  const ciclo = cicloNovo(id);
  ["2026-09-02", "2026-09-09", "2026-09-16", "2026-09-23"].forEach((data, i) =>
    ciclo.registrarAtividade({
      id: `ativ-${i + 1}`,
      data,
      descricao: `Treino ${"ABCD"[i]} — superiores e inferiores`,
      horas: 3,
      local: null,
    }),
  );
  ciclo.registrarAvaliacaoPersonal({
    criterios: criterios([9, 8, 10, 7.5], ["Execução técnica", "Evolução de carga", "Frequência", "Postura e segurança"]),
    comentario: "Evoluiu bem no agachamento.",
    agora: AGORA,
  });
  ciclo.registrarAutoAvaliacao({
    criterios: criterios([8, 6, 7, 9], ["Disciplina", "Alimentação", "Sono e recuperação", "Esforço nos treinos"]),
    comentario: "Preciso dormir melhor.",
    agora: AGORA,
  });
  return ciclo;
}

export function cicloAguardandoAprovacao(id = "ciclo-set"): CicloAvaliacao {
  const ciclo = cicloProntoParaAssinar(id);
  ciclo.assinar("aluno", Assinatura.criar(ASSINATURA_B64, AGORA));
  ciclo.assinar("personal", Assinatura.criar(ASSINATURA_B64, AGORA));
  return ciclo;
}

export function cicloAprovado(
  { assinaturasSincronizadas = true } = {},
  id = "ciclo-set",
): CicloAvaliacao {
  const ciclo = cicloAguardandoAprovacao(id);
  ciclo.aprovar(AGORA);
  if (assinaturasSincronizadas) {
    ciclo.marcarSincronizacao("assinatura:aluno", StatusSincronizacao.SYNCED);
    ciclo.marcarSincronizacao("assinatura:personal", StatusSincronizacao.SYNCED);
  }
  return ciclo;
}
