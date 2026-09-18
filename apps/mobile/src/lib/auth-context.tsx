import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  MIN_PASSWORD_LENGTH,
  SignInUseCase,
  SignUpUseCase,
  type AuthRejection,
} from "@px/core";
import { SupabaseAuthGateway } from "@px/db";
import { supabase } from "./supabase";

/*
 * Composition root da autenticação: regras (formato de e-mail, tamanho e
 * confirmação de senha) nos use cases do @px/core; Supabase Auth atrás do
 * AuthGateway. A sessão em si continua vindo do supabase-js (persistida
 * cifrada pelo LargeSecureStore) e alimenta o Stack.Protected do layout raiz.
 */
const authGateway = new SupabaseAuthGateway(supabase);
const signInUseCase = new SignInUseCase(authGateway);
const signUpUseCase = new SignUpUseCase(authGateway);

const REJECTION_MESSAGES: Record<AuthRejection, string> = {
  "invalid-email": "Confira o e-mail — o formato não parece válido.",
  "missing-password": "Digite sua senha.",
  "password-too-short": `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
  "password-mismatch": "As senhas não conferem.",
  "invalid-credentials": "E-mail ou senha inválidos.",
  "email-not-confirmed":
    "Confirme seu e-mail pelo link que enviamos antes de entrar.",
  "email-taken": "Já existe uma conta com esse e-mail.",
  "weak-password": "Essa senha é fraca demais — tente uma mais longa.",
  "rate-limited": "Muitas tentativas seguidas. Espere um pouco e tente de novo.",
  network: "Sem conexão com o servidor. Confira sua internet e tente de novo.",
  unknown: "Não foi possível concluir agora. Tente novamente.",
};

type AuthState = {
  session: Session | null;
  /** true enquanto a sessão persistida ainda não foi carregada do storage. */
  loading: boolean;
  signIn(email: string, password: string): Promise<{ error: string | null }>;
  signUp(
    email: string,
    password: string,
    passwordConfirmation: string,
  ): Promise<{ error: string | null; confirmationSent: boolean }>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    session,
    loading,
    async signIn(email, password) {
      const result = await signInUseCase.execute({ email, password });
      return {
        error:
          result.status === "rejected"
            ? REJECTION_MESSAGES[result.reason]
            : null,
      };
    },
    async signUp(email, password, passwordConfirmation) {
      const result = await signUpUseCase.execute({
        email,
        password,
        passwordConfirmation,
      });
      return {
        error:
          result.status === "rejected"
            ? REJECTION_MESSAGES[result.reason]
            : null,
        confirmationSent: result.status === "confirmation-sent",
      };
    },
    async signOut() {
      await authGateway.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
