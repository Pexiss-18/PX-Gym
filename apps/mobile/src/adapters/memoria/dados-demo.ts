import {
  Acompanhamento,
  Assinatura,
  CicloAvaliacao,
  Criterio,
  StatusSincronizacao,
  TokenPersonal,
} from "@px/core";
import { svgParaBase64, tracosParaSvg } from "../screens/assinatura-svg";
import { USUARIOS_DEMO } from "./gateways-simulados";

/*
 * Dados de demonstração, montados PELO DOMÍNIO (abrir → registrar → avaliar
 * → assinar → aprovar), nunca escritos à mão: se uma regra mudar, a carga
 * de demonstração quebra junto, em vez de mostrar um estado impossível.
 *
 * Três ciclos relativos a "hoje", pra demo nunca ficar fora de data:
 * - mês retrasado: aprovado e sincronizado (PDF liberado);
 * - mês passado: assinado, aguardando a coordenação;
 * - mês atual: em andamento, com metade das horas.
 */

export const TOKEN_DEMO = "CARLA-2026";

/** Uma rubrica desenhada "à mão", no mesmo formato do quadro de assinatura. */
const RUBRICA = svgParaBase64(
  tracosParaSvg(
    [
      [
        { x: 12, y: 78 }, { x: 30, y: 30 }, { x: 44, y: 70 }, { x: 60, y: 28 },
        { x: 78, y: 82 }, { x: 110, y: 50 }, { x: 150, y: 64 }, { x: 196, y: 40 },
        { x: 240, y: 58 }, { x: 286, y: 44 },
      ],
      [{ x: 40, y: 96 }, { x: 250, y: 90 }],
    ],
    300,
    120,
  ),
);

const aluno = USUARIOS_DEMO["aluno@pxgym.dev"]!;
const personal = USUARIOS_DEMO["personal@pxgym.dev"]!;

function dia(ano: number, mes: number, d: number): string {
  const data = new Date(ano, mes, d);
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  const dd = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mm}-${dd}`;
}

/** Primeiro e último dia do mês `deslocamento` meses a partir de hoje. */
function mes(hoje: Date, deslocamento: number) {
  const ano = hoje.getFullYear();
  const m = hoje.getMonth() + deslocamento;
  return {
    inicio: dia(ano, m, 1),
    fim: dia(ano, m + 1, 0),
    no: (d: number) => dia(ano, m, d),
    nome: new Date(ano, m, 1).toLocaleDateString("pt-BR", { month: "long" }),
  };
}

const TREINOS = [
  "Treino A — peito, ombro e tríceps",
  "Treino B — costas e bíceps",
  "Treino C — pernas completo",
  "Treino D — posterior e glúteo",
  "Cardio intervalado + core",
];

function abrir(id: string, titulo: string, m: ReturnType<typeof mes>) {
  return CicloAvaliacao.abrir({
    id,
    acompanhamentoId: "acomp-1",
    alunoId: aluno.id,
    personalId: personal.id,
    titulo,
    inicio: m.inicio,
    fim: m.fim,
    horasMinimas: 12,
    horasPeriodo: 40,
  });
}

function preencher(ciclo: CicloAvaliacao, m: ReturnType<typeof mes>, agora: Date) {
  TREINOS.forEach((descricao, i) =>
    ciclo.registrarAtividade({
      id: `${ciclo.id}-t${i + 1}`,
      data: m.no(3 + i * 5),
      descricao,
      horas: 2.5,
      local: null,
    }),
  );
  ciclo.registrarAvaliacaoPersonal({
    criterios: [
      Criterio.criar("Execução técnica", 9),
      Criterio.criar("Evolução de carga", 8),
      Criterio.criar("Frequência", 9.5),
      Criterio.criar("Postura e segurança", 7.5),
    ],
    comentario: "Boa consistência. Atenção à lombar no terra.",
    agora,
  });
  ciclo.registrarAutoAvaliacao({
    criterios: [
      Criterio.criar("Disciplina", 8),
      Criterio.criar("Alimentação", 6.5),
      Criterio.criar("Sono e recuperação", 6),
      Criterio.criar("Esforço nos treinos", 9),
    ],
    comentario: "Preciso dormir mais cedo.",
    agora,
  });
  ciclo.assinar("aluno", Assinatura.criar(RUBRICA, agora));
  ciclo.assinar("personal", Assinatura.criar(RUBRICA, agora));
}

export function criarDadosDemo(hoje: Date) {
  const retrasado = mes(hoje, -2);
  const passado = mes(hoje, -1);
  const atual = mes(hoje, 0);

  const acompanhamento = Acompanhamento.iniciar({
    id: "acomp-1",
    alunoId: aluno.id,
    alunoNome: aluno.nome,
    personalId: personal.id,
    personalNome: personal.nome,
    academia: "Px GYM Centro",
    inicio: retrasado.inicio,
    fim: mes(hoje, 6).fim,
  });

  const aprovado = abrir("ciclo-1", `Ciclo de ${retrasado.nome} — Adaptação`, retrasado);
  preencher(aprovado, retrasado, hoje);
  aprovado.aprovar(hoje);
  for (const item of aprovado.itensSincronizaveis()) {
    aprovado.marcarSincronizacao(item.chave, StatusSincronizacao.SYNCED);
  }

  const aguardando = abrir("ciclo-2", `Ciclo de ${passado.nome} — Força`, passado);
  preencher(aguardando, passado, hoje);

  const emAndamento = abrir("ciclo-3", `Ciclo de ${atual.nome} — Hipertrofia`, atual);
  [0, 1, 2].forEach((i) =>
    emAndamento.registrarAtividade({
      id: `ciclo-3-t${i + 1}`,
      data: atual.no(1 + i * 2),
      descricao: TREINOS[i]!,
      horas: 2,
      local: null,
    }),
  );

  const token = TokenPersonal.emitir({
    token: TOKEN_DEMO,
    acompanhamentoId: acompanhamento.id,
    personalId: personal.id,
    personalNome: personal.nome,
    agora: hoje,
    validadeHoras: 24 * 30,
  });

  return {
    acompanhamentos: [acompanhamento],
    ciclos: [aprovado, aguardando, emAndamento],
    tokens: [token],
  };
}
