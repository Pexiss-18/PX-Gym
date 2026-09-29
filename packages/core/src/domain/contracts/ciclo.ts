import type { Acompanhamento } from "../entities/acompanhamento";
import type { CicloAvaliacao, ItemSincronizavel } from "../entities/ciclo-avaliacao";
import type { TokenPersonal } from "../entities/token-personal";
import type { Sessao } from "../value-objects/sessao";

/*
 * Contratos do relatório de ciclo. Só declaração: quem implementa é a borda
 * (Map em memória nesta fase; SQLite/Supabase depois), e os use cases
 * enxergam apenas estas interfaces.
 */

/** Repositório do Aggregate Root (o "PeriodoAvaliacaoRepository"). */
export interface CicloAvaliacaoRepository {
  salvar(ciclo: CicloAvaliacao): Promise<void>;
  porId(id: string): Promise<CicloAvaliacao | null>;
  listarPorAluno(alunoId: string): Promise<CicloAvaliacao[]>;
  listarPorPersonal(personalId: string): Promise<CicloAvaliacao[]>;
  listarTodos(): Promise<CicloAvaliacao[]>;
}

export interface AcompanhamentoRepository {
  porId(id: string): Promise<Acompanhamento | null>;
}

export interface TokenPersonalRepository {
  porToken(token: string): Promise<TokenPersonal | null>;
  salvar(token: TokenPersonal): Promise<void>;
}

/** Guarda a sessão no aparelho (Keychain/Keystore via expo-secure-store). */
export interface SessionStorage {
  salvar(sessao: Sessao): Promise<void>;
  carregar(): Promise<Sessao | null>;
  limpar(): Promise<void>;
}

export type FotoCapturada = {
  uri: string;
  largura: number;
  altura: number;
};

export type PermissaoCamera = "concedida" | "negada" | "bloqueada";

/** Câmera do aparelho (expo-camera na borda, fake nos testes). */
export interface CameraGateway {
  permissao(): Promise<PermissaoCamera>;
  solicitarPermissao(): Promise<PermissaoCamera>;
  capturar(): Promise<FotoCapturada>;
}

/** O que vai impresso no PDF: nada de entidade, só dados prontos. */
export type RelatorioParaPdf = {
  cicloId: string;
  titulo: string;
  alunoNome: string;
  personalNome: string;
  academia: string;
  periodo: string;
  horasTotais: number;
  horasMinimas: number;
  atividades: { data: string; descricao: string; horas: number }[];
  avaliacaoPersonal: { nome: string; nota: number; faixa: string }[];
  autoAvaliacao: { nome: string; nota: number; faixa: string }[];
  assinaturas: { signatario: string; dataUri: string; em: Date }[];
  aprovadoEm: Date;
};

/** Gera o arquivo e devolve onde ele ficou (uri local). */
export interface PdfGateway {
  gerar(relatorio: RelatorioParaPdf): Promise<string>;
}

/** Envio de um item da fila pro backend. Lança se falhar. */
export interface SincronizacaoGateway {
  enviar(item: ItemSincronizavel, ciclo: CicloAvaliacao): Promise<void>;
}
