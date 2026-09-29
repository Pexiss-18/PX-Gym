import type { PropsWithChildren, ReactElement } from "react";
import { render } from "@testing-library/react-native";
import type { AuthGateway, Sessao, UsuarioAutenticado } from "@px/core";
import { FixedClock, SequenceIds } from "@px/core/testing/fakes";
import { SessionStorageFake } from "@px/core/testing/fakes-ciclo";
import { AuthProvider } from "../../context/AuthContext";
import { CasosDeUsoProvider } from "../../context/CasosDeUsoContext";
import { criarComposicao, type CasosDeUso, type ServicosAuth } from "../../composicao";
import { useAuth } from "../../hooks/useAuth";
import { USUARIOS_DEMO } from "../../memoria/gateways-simulados";

/** 29/09/2026 10h, horário local — o mesmo "hoje" em todos os testes de tela. */
export const HOJE = new Date(2026, 8, 29, 10, 0);

export const ALUNO = USUARIOS_DEMO["aluno@pxgym.dev"]!;
export const PERSONAL = USUARIOS_DEMO["personal@pxgym.dev"]!;
export const COORDENACAO = USUARIOS_DEMO["coordenacao@pxgym.dev"]!;

export const sessaoDe = (usuario: UsuarioAutenticado): Sessao => ({
  usuario,
  token: `stub-${usuario.id}`,
  expiraEm: null,
});

/** Igual ao layout raiz: só mostra a área logada depois que a sessão carregou. */
function SoComSessao({ children }: PropsWithChildren) {
  const { sessao, carregando } = useAuth();
  if (carregando || !sessao) return null;
  return <>{children}</>;
}

/**
 * Monta a árvore de providers com o composition root real, porém com
 * relógio fixo, ids previsíveis, sessão em memória (stub do SecureStore) e
 * latência zero. Dá pra trocar qualquer grupo de use cases por fakes.
 */
export function montar(
  opcoes: {
    logado?: UsuarioAutenticado | null;
    auth?: AuthGateway;
    casos?: Partial<CasosDeUso>;
    servicosAuth?: Partial<ServicosAuth>;
    exigirSessao?: boolean;
  } = {},
) {
  const sessoes = new SessionStorageFake(opcoes.logado ? sessaoDe(opcoes.logado) : null);
  const composicao = criarComposicao({
    clock: new FixedClock(HOJE),
    ids: new SequenceIds(),
    sessoes,
    auth: opcoes.auth,
    latenciaMs: 0,
  });
  const casos = { ...composicao.casos, ...opcoes.casos };
  const servicos = { ...composicao.auth, ...opcoes.servicosAuth };
  const exigirSessao = opcoes.exigirSessao ?? opcoes.logado != null;

  function Providers({ children }: PropsWithChildren) {
    return (
      <AuthProvider servicos={servicos}>
        <CasosDeUsoProvider casos={casos}>
          {exigirSessao ? <SoComSessao>{children}</SoComSessao> : children}
        </CasosDeUsoProvider>
      </AuthProvider>
    );
  }

  return {
    sessoes,
    casos,
    Providers,
    renderizar: (ui: ReactElement) => render(ui, { wrapper: Providers }),
  };
}
