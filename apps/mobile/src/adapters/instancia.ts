import { SupabaseAuthGateway } from "@px/db";
import { supabase } from "@/lib/supabase";
import { cryptoIds, systemClock } from "@/lib/system";
import { SessionStorageSecureStore } from "./auth/SessionStorageSecureStore";
import { criarComposicao } from "./composicao";
import { SENHA_DEMO } from "./memoria/gateways-simulados";
import type { ContaDemo } from "./screens/LoginScreen";

/**
 * Fase atual: domínio e interface primeiro, 100% mock. O login usa o
 * AuthGatewayStub e os relatórios vivem em Map. EXPO_PUBLIC_MODO_MOCK=0 liga
 * o login real do Supabase (o resto do relatório continua em memória).
 */
export const MODO_MOCK = process.env.EXPO_PUBLIC_MODO_MOCK !== "0";

export const composicao = criarComposicao({
  clock: systemClock,
  ids: cryptoIds,
  sessoes: new SessionStorageSecureStore(),
  auth: MODO_MOCK ? undefined : new SupabaseAuthGateway(supabase),
});

export const CONTAS_DEMO: ContaDemo[] = MODO_MOCK
  ? [
      { rotulo: "Aluno", email: "aluno@pxgym.dev", senha: SENHA_DEMO },
      { rotulo: "Personal", email: "personal@pxgym.dev", senha: SENHA_DEMO },
      { rotulo: "Coordenação", email: "coordenacao@pxgym.dev", senha: SENHA_DEMO },
    ]
  : [];
