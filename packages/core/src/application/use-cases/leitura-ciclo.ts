import type { Avaliacao, CicloAvaliacao } from "../../domain/entities/ciclo-avaliacao";
import { mediaDosCriterios, type Faixa } from "../../domain/value-objects/criterio";
import type { UsuarioAutenticado } from "../../domain/value-objects/sessao";
import {
  ROTULO_STATUS_CICLO,
  type StatusCiclo,
  type StatusSincronizacao,
} from "../../domain/value-objects/status";
import {
  RegraGeracaoPdfService,
  type VerificacaoPdf,
} from "../../domain/services/regra-geracao-pdf";

/*
 * Modelo de leitura do ciclo: o que a tela recebe. É dado puro — a tela
 * nunca segura o agregado, então não tem como chamar ciclo.aprovar() por
 * fora de um use case.
 */

export type AvaliacaoLeitura = {
  criterios: { nome: string; nota: number; faixa: Faixa }[];
  comentario: string;
  media: number;
  registradaEm: Date;
  statusSincronizacao: StatusSincronizacao;
};

export type CicloLeitura = {
  id: string;
  acompanhamentoId: string;
  alunoId: string;
  personalId: string;
  titulo: string;
  inicio: string;
  fim: string;
  status: StatusCiclo;
  rotuloStatus: string;
  editavel: boolean;
  horas: {
    totais: number;
    minimas: number;
    periodo: number;
    faltam: number;
    progresso: number;
    cumpriuMinimo: boolean;
  };
  atividades: {
    id: string;
    data: string;
    descricao: string;
    horas: number;
    local: { latitude: number; longitude: number } | null;
    statusSincronizacao: StatusSincronizacao;
  }[];
  avaliacaoPersonal: AvaliacaoLeitura | null;
  autoAvaliacao: AvaliacaoLeitura | null;
  assinaturas: {
    signatario: "aluno" | "personal";
    dataUri: string;
    em: Date;
    statusSincronizacao: StatusSincronizacao;
  }[];
  devolucoes: { motivo: string; em: Date }[];
  pendenciasParaAssinar: string[];
  pdf: VerificacaoPdf;
};

const regraPdf = new RegraGeracaoPdfService();

export function paraLeitura(ciclo: CicloAvaliacao): CicloLeitura {
  const carga = ciclo.cargaHoraria;
  return {
    id: ciclo.id,
    acompanhamentoId: ciclo.acompanhamentoId,
    alunoId: ciclo.alunoId,
    personalId: ciclo.personalId,
    titulo: ciclo.titulo,
    inicio: ciclo.inicio,
    fim: ciclo.fim,
    status: ciclo.status,
    rotuloStatus: ROTULO_STATUS_CICLO[ciclo.status],
    editavel: ciclo.editavel,
    horas: {
      totais: carga.totais,
      minimas: carga.minimas,
      periodo: carga.periodo,
      faltam: carga.faltam,
      progresso: carga.progresso,
      cumpriuMinimo: carga.cumpriuMinimo,
    },
    atividades: [...ciclo.atividades]
      .sort((a, b) => b.data.localeCompare(a.data))
      .map((a) => ({
        id: a.id,
        data: a.data,
        descricao: a.descricao,
        horas: a.horas,
        local: a.local
          ? { latitude: a.local.latitude, longitude: a.local.longitude }
          : null,
        statusSincronizacao: a.statusSincronizacao,
      })),
    avaliacaoPersonal: avaliacaoLeitura(ciclo.avaliacaoPersonal),
    autoAvaliacao: avaliacaoLeitura(ciclo.autoAvaliacao),
    assinaturas: ciclo.assinaturas.map((a) => ({
      signatario: a.signatario,
      dataUri: a.assinatura.dataUri,
      em: a.assinatura.timestamp,
      statusSincronizacao: a.statusSincronizacao,
    })),
    devolucoes: ciclo.devolucoes.map((d) => ({ motivo: d.motivo, em: d.em })),
    pendenciasParaAssinar: ciclo.pendenciasParaAssinar(),
    pdf: regraPdf.verificar(ciclo),
  };
}

function avaliacaoLeitura(a: Avaliacao | null): AvaliacaoLeitura | null {
  if (!a) return null;
  return {
    criterios: a.criterios.map((c) => ({ nome: c.nome, nota: c.nota, faixa: c.faixa })),
    comentario: a.comentario,
    media: mediaDosCriterios(a.criterios),
    registradaEm: a.registradaEm,
    statusSincronizacao: a.statusSincronizacao,
  };
}

/** Aluno e personal veem os próprios ciclos; a coordenação vê todos. */
export function podeVer(usuario: UsuarioAutenticado, ciclo: CicloAvaliacao): boolean {
  switch (usuario.papel) {
    case "aluno":
      return ciclo.alunoId === usuario.id;
    case "personal":
      return ciclo.personalId === usuario.id;
    case "coordenacao":
      return true;
  }
}
