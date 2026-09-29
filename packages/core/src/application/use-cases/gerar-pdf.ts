import type {
  AcompanhamentoRepository,
  CicloAvaliacaoRepository,
  PdfGateway,
  RelatorioParaPdf,
} from "../../domain/contracts";
import type { Avaliacao } from "../../domain/entities/ciclo-avaliacao";
import { RegraGeracaoPdfService } from "../../domain/services/regra-geracao-pdf";
import type { UsuarioAutenticado } from "../../domain/value-objects/sessao";
import { podeVer } from "./leitura-ciclo";
import { falha, sucesso, type Resultado } from "./resultado";

/**
 * Gera o PDF do relatório aprovado. A regra (aprovado + assinaturas
 * sincronizadas) é do domínio; aqui só se monta o documento e chama o
 * gateway.
 */
export class GerarPdfUseCase {
  constructor(
    private readonly ciclos: CicloAvaliacaoRepository,
    private readonly acompanhamentos: AcompanhamentoRepository,
    private readonly pdf: PdfGateway,
    private readonly regra = new RegraGeracaoPdfService(),
  ) {}

  async execute(input: {
    usuario: UsuarioAutenticado;
    cicloId: string;
  }): Promise<Resultado<{ uri: string }>> {
    const ciclo = await this.ciclos.porId(input.cicloId);
    if (!ciclo) return falha("nao-encontrado", "Ciclo não encontrado.");
    if (!podeVer(input.usuario, ciclo)) {
      return falha("sem-permissao", "Você não participa deste ciclo.");
    }

    const verificacao = this.regra.verificar(ciclo);
    if (!verificacao.permitido) {
      return falha("regra-de-negocio", verificacao.pendencias.join(" "));
    }

    const acompanhamento = await this.acompanhamentos.porId(ciclo.acompanhamentoId);
    if (!acompanhamento) {
      return falha("nao-encontrado", "Acompanhamento do ciclo não encontrado.");
    }

    const relatorio: RelatorioParaPdf = {
      cicloId: ciclo.id,
      titulo: ciclo.titulo,
      alunoNome: acompanhamento.alunoNome,
      personalNome: acompanhamento.personalNome,
      academia: acompanhamento.academia,
      periodo: `${ciclo.inicio} a ${ciclo.fim}`,
      horasTotais: ciclo.cargaHoraria.totais,
      horasMinimas: ciclo.cargaHoraria.minimas,
      atividades: [...ciclo.atividades]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((a) => ({ data: a.data, descricao: a.descricao, horas: a.horas })),
      avaliacaoPersonal: linhas(ciclo.avaliacaoPersonal),
      autoAvaliacao: linhas(ciclo.autoAvaliacao),
      assinaturas: ciclo.assinaturas.map((a) => ({
        signatario: a.signatario,
        dataUri: a.assinatura.dataUri,
        em: a.assinatura.timestamp,
      })),
      // podeGerarPdf() garante aprovado ⇒ aprovadoEm preenchido.
      aprovadoEm: ciclo.aprovadoEm!,
    };

    try {
      return sucesso({ uri: await this.pdf.gerar(relatorio) });
    } catch {
      return falha("falha-externa", "Não foi possível gerar o PDF agora.");
    }
  }
}

function linhas(a: Avaliacao | null) {
  return (a?.criterios ?? []).map((c) => ({ nome: c.nome, nota: c.nota, faixa: c.faixa }));
}
