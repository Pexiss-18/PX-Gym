import type { LocationGateway } from "@px/core";
import { SupabaseAuthGateway } from "@px/db";
import { MODO_MOCK } from "@/lib/modo";
import { supabase } from "@/lib/supabase";
import { cryptoIds, systemClock } from "@/lib/system";
import { SessionStorageSecureStore } from "./auth/SessionStorageSecureStore";
import { criarComposicao } from "./composicao";
import { LocationGatewayExpo } from "./gateways/LocationGatewayExpo";
import { LocationGatewaySimulado, SENHA_DEMO } from "./memoria/gateways-simulados";
import type { ContaDemo } from "./screens/LoginScreen";

export { MODO_MOCK };

/*
 * O login é o real do Supabase; os relatórios do ciclo ainda vivem em Map.
 * Com EXPO_PUBLIC_MODO_MOCK=1 o login passa a usar o AuthGatewayStub.
 */
export const composicao = criarComposicao({
  clock: systemClock,
  ids: cryptoIds,
  sessoes: new SessionStorageSecureStore(),
  auth: MODO_MOCK ? undefined : new SupabaseAuthGateway(supabase),
});

/** GPS do check-in: simulado no modo mock, o do aparelho fora dele. */
export const localizacao: LocationGateway = MODO_MOCK
  ? new LocationGatewaySimulado()
  : new LocationGatewayExpo();

export const CONTAS_DEMO: ContaDemo[] = MODO_MOCK
  ? [
      { rotulo: "Aluno", email: "aluno@pxgym.dev", senha: SENHA_DEMO },
      { rotulo: "Personal", email: "personal@pxgym.dev", senha: SENHA_DEMO },
      { rotulo: "Coordenação", email: "coordenacao@pxgym.dev", senha: SENHA_DEMO },
    ]
  : [];
