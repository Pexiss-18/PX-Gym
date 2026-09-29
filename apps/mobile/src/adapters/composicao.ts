import {
  AcessarViaTokenUseCase,
  AprovarRelatorioUseCase,
  AssinarRelatorioUseCase,
  AutenticarUsuarioUseCase,
  AvaliarDesempenhoUseCase,
  ConsultarRelatorioUseCase,
  DevolverRelatorioUseCase,
  EncerrarSessaoUseCase,
  GerarPdfUseCase,
  ListarRelatoriosUseCase,
  RealizarAutoAvaliacaoUseCase,
  RegistrarAtividadesUseCase,
  RestaurarSessaoUseCase,
  SignUpUseCase,
  SincronizarFilaUseCase,
  type AuthGateway,
  type Clock,
  type IdGenerator,
  type SessionStorage,
} from "@px/core";
import { criarDadosDemo } from "./memoria/dados-demo";
import {
  AuthGatewayStub,
  PdfGatewaySimulado,
  SincronizacaoGatewaySimulado,
  conectividadeSimulada,
} from "./memoria/gateways-simulados";
import {
  AcompanhamentoRepositoryMemoria,
  CicloAvaliacaoRepositoryMemoria,
  TokenPersonalRepositoryMemoria,
} from "./memoria/repositorios";

/*
 * Composition root: o ÚNICO lugar que conhece as classes concretas. Monta
 * cada use case com suas dependências e entrega tudo pronto pros Providers.
 * Nesta fase, repositórios são Map em memória e os gateways são simulados.
 */

export type ServicosAuth = {
  autenticar: Pick<AutenticarUsuarioUseCase, "execute">;
  restaurar: Pick<RestaurarSessaoUseCase, "execute">;
  encerrar: Pick<EncerrarSessaoUseCase, "execute">;
  acessarViaToken: Pick<AcessarViaTokenUseCase, "execute">;
  cadastrar: Pick<SignUpUseCase, "execute">;
};

export type CasosDeUso = {
  registrarAtividades: Pick<RegistrarAtividadesUseCase, "execute">;
  avaliarDesempenho: Pick<AvaliarDesempenhoUseCase, "execute">;
  realizarAutoAvaliacao: Pick<RealizarAutoAvaliacaoUseCase, "execute">;
  assinarRelatorio: Pick<AssinarRelatorioUseCase, "execute">;
  aprovarRelatorio: Pick<AprovarRelatorioUseCase, "execute">;
  devolverRelatorio: Pick<DevolverRelatorioUseCase, "execute">;
  gerarPdf: Pick<GerarPdfUseCase, "execute">;
  sincronizarFila: Pick<SincronizarFilaUseCase, "execute">;
  listarRelatorios: Pick<ListarRelatoriosUseCase, "execute">;
  consultarRelatorio: Pick<ConsultarRelatorioUseCase, "execute">;
};

export function criarComposicao(deps: {
  clock: Clock;
  ids: IdGenerator;
  sessoes: SessionStorage;
  /** Stub nesta fase; o SupabaseAuthGateway entra quando o backend entrar. */
  auth?: AuthGateway;
  /** Atraso dos gateways simulados (0 nos testes). */
  latenciaMs?: number;
}): { auth: ServicosAuth; casos: CasosDeUso } {
  const demo = criarDadosDemo(deps.clock.now());
  const ciclos = new CicloAvaliacaoRepositoryMemoria(demo.ciclos);
  const acompanhamentos = new AcompanhamentoRepositoryMemoria(demo.acompanhamentos);
  const tokens = new TokenPersonalRepositoryMemoria(demo.tokens);
  const lat = deps.latenciaMs;
  const auth = deps.auth ?? new AuthGatewayStub(lat);

  return {
    auth: {
      autenticar: new AutenticarUsuarioUseCase(auth, deps.sessoes),
      restaurar: new RestaurarSessaoUseCase(deps.sessoes, deps.clock),
      encerrar: new EncerrarSessaoUseCase(auth, deps.sessoes),
      acessarViaToken: new AcessarViaTokenUseCase(tokens, acompanhamentos, deps.sessoes, deps.clock),
      cadastrar: new SignUpUseCase(auth),
    },
    casos: {
      registrarAtividades: new RegistrarAtividadesUseCase(ciclos, deps.ids),
      avaliarDesempenho: new AvaliarDesempenhoUseCase(ciclos, deps.clock),
      realizarAutoAvaliacao: new RealizarAutoAvaliacaoUseCase(ciclos, deps.clock),
      assinarRelatorio: new AssinarRelatorioUseCase(ciclos, deps.clock),
      aprovarRelatorio: new AprovarRelatorioUseCase(ciclos, deps.clock),
      devolverRelatorio: new DevolverRelatorioUseCase(ciclos, deps.clock),
      gerarPdf: new GerarPdfUseCase(ciclos, acompanhamentos, new PdfGatewaySimulado(lat)),
      sincronizarFila: new SincronizarFilaUseCase(
        ciclos,
        new SincronizacaoGatewaySimulado(lat),
        conectividadeSimulada,
      ),
      listarRelatorios: new ListarRelatoriosUseCase(ciclos),
      consultarRelatorio: new ConsultarRelatorioUseCase(ciclos),
    },
  };
}
