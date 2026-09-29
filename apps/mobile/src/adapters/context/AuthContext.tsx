import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { MIN_PASSWORD_LENGTH, type AuthRejection, type RecusaToken, type Sessao } from "@px/core";
import type { ServicosAuth } from "../composicao";

/*
 * Context API da sessão. Mora na camada de adapters: domínio e aplicação
 * nunca importam isto. O <AuthProvider> envolve a raiz do app e qualquer
 * tela lê o usuário logado com useAuth() — sem prop drilling de "usuario"
 * por cinco níveis de componente.
 */

export const MENSAGENS_RECUSA: Record<AuthRejection, string> = {
  "invalid-email": "Confira o e-mail — o formato não parece válido.",
  "missing-password": "Digite sua senha.",
  "password-too-short": `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
  "password-mismatch": "As senhas não conferem.",
  "invalid-credentials": "E-mail ou senha inválidos.",
  "email-not-confirmed": "Confirme seu e-mail pelo link que enviamos antes de entrar.",
  "email-taken": "Já existe uma conta com esse e-mail.",
  "weak-password": "Essa senha é fraca demais — tente uma mais longa.",
  "rate-limited": "Muitas tentativas seguidas. Espere um pouco e tente de novo.",
  network: "Sem conexão com o servidor. Confira sua internet e tente de novo.",
  unknown: "Não foi possível concluir agora. Tente novamente.",
};

export const MENSAGENS_TOKEN: Record<RecusaToken, string> = {
  "token-invalido": "Código não encontrado. Confira com o aluno.",
  "token-expirado": "Este código expirou. Peça um novo ao aluno.",
  "token-revogado": "Este código foi cancelado pelo aluno.",
  "acompanhamento-encerrado": "O acompanhamento deste aluno já foi encerrado.",
};

export type EstadoAuth = {
  sessao: Sessao | null;
  /** true enquanto a sessão salva no aparelho ainda está sendo lida. */
  carregando: boolean;
  entrar(email: string, senha: string): Promise<{ erro: string | null }>;
  entrarComToken(token: string): Promise<{ erro: string | null }>;
  cadastrar(
    email: string,
    senha: string,
    confirmacao: string,
  ): Promise<{ erro: string | null; confirmacaoEnviada: boolean }>;
  sair(): Promise<void>;
};

export const AuthContext = createContext<EstadoAuth | null>(null);

export function AuthProvider({
  servicos,
  children,
}: PropsWithChildren<{ servicos: ServicosAuth }>) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Abertura do app: sessão salva no SecureStore (se ainda valer).
  useEffect(() => {
    let ativo = true;
    servicos.restaurar
      .execute()
      .catch(() => null)
      .then((salva) => {
        if (!ativo) return;
        setSessao(salva);
        setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [servicos]);

  const entrar = useCallback(
    async (email: string, senha: string) => {
      const r = await servicos.autenticar.execute({ email, senha });
      if (r.status === "recusado") return { erro: MENSAGENS_RECUSA[r.motivo] };
      setSessao(r.sessao);
      return { erro: null };
    },
    [servicos],
  );

  const entrarComToken = useCallback(
    async (token: string) => {
      const r = await servicos.acessarViaToken.execute({ token });
      if (r.status === "recusado") return { erro: MENSAGENS_TOKEN[r.motivo] };
      setSessao(r.sessao);
      return { erro: null };
    },
    [servicos],
  );

  const cadastrar = useCallback(
    async (email: string, senha: string, confirmacao: string) => {
      const r = await servicos.cadastrar.execute({
        email,
        password: senha,
        passwordConfirmation: confirmacao,
      });
      return {
        erro: r.status === "rejected" ? MENSAGENS_RECUSA[r.reason] : null,
        confirmacaoEnviada: r.status === "confirmation-sent",
      };
    },
    [servicos],
  );

  const sair = useCallback(async () => {
    try {
      await servicos.encerrar.execute();
    } catch {
      // Sem rede pra avisar o provedor: o use case já apagou a sessão do
      // aparelho, então a saída local vale do mesmo jeito.
    }
    setSessao(null);
  }, [servicos]);

  const valor = useMemo<EstadoAuth>(
    () => ({ sessao, carregando, entrar, entrarComToken, cadastrar, sair }),
    [sessao, carregando, entrar, entrarComToken, cadastrar, sair],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
