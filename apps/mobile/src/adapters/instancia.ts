import { SupabaseAuthGateway } from "@px/db";
import { MODO_MOCK } from "@/lib/modo";
import { supabase } from "@/lib/supabase";
import { cryptoIds, systemClock } from "@/lib/system";
import { SessionStorageSecureStore } from "./auth/SessionStorageSecureStore";
import { criarComposicao } from "./composicao";
import { SENHA_DEMO } from "./memoria/gateways-simulados";
import type { ContaDemo } from "./screens/LoginScreen";

export { MODO_MOCK };

/*
 * No modo mock o login usa o AuthGatewayStub e os relatórios vivem em Map.
 * Com EXPO_PUBLIC_MODO_MOCK=0 entra o login real do Supabase (o relatório
 * continua em memória).
 */
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
