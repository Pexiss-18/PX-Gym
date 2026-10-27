/**
 * O padrão é o app real: SQLite local e Supabase. EXPO_PUBLIC_MODO_MOCK=1
 * liga o modo mock da fase "domínio e interface primeiro" — o app não abre o
 * SQLite nem cria o cliente do Supabase, o login é por stub e o GPS e as
 * fotos são simulados.
 */
export const MODO_MOCK = process.env.EXPO_PUBLIC_MODO_MOCK === "1";

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
