import { BusinessRuleError } from "@px/core";

/**
 * Recusa de uma Edge Function (4xx: limite, perfil incompleto, PDF que não é
 * avaliação, nada pra mudar) vira BusinessRuleError com a mensagem do
 * servidor, que já é escrita pra pessoa. O resto (5xx, rede) passa como erro
 * comum. `context` é a Response do FunctionsHttpError.
 */
export async function traduzirErroDaFuncao(error: unknown): Promise<Error> {
  // Duck typing em vez de `instanceof Response`: no React Native a Response
  // do supabase-js pode não ser a mesma classe global, e aí a mensagem do
  // servidor se perdia e a tela mostrava "non-2xx status code".
  const response = (error as { context?: unknown }).context as Response | undefined;
  if (response && typeof response.json === "function" && typeof response.status === "number") {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    const message = body?.error ?? `a função respondeu ${response.status}`;
    return response.status >= 400 && response.status < 500
      ? new BusinessRuleError(message)
      : new Error(message);
  }
  return error instanceof Error ? error : new Error(String(error));
}
