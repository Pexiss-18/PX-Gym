/**
 * Fase atual: domínio e interface primeiro, 100% mock. Neste modo o app não
 * abre o SQLite nem cria o cliente do Supabase — login por stub, relatórios
 * em Map. EXPO_PUBLIC_MODO_MOCK=0 religa a infraestrutura real.
 */
export const MODO_MOCK = process.env.EXPO_PUBLIC_MODO_MOCK !== "0";

/**
 * Ocupa o lugar de um recurso de infraestrutura no modo mock: quem guarda a
 * referência não paga nada; quem tentar usar descobre na hora, com o nome.
 */
export function desligadoNoMock<T extends object>(nome: string): T {
  return new Proxy({} as T, {
    get(_alvo, chave) {
      if (typeof chave === "symbol") return undefined;
      throw new Error(`${nome} está desligado no modo mock (acesso a "${chave}").`);
    },
  });
}
