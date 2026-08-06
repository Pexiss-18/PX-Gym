import {
  createClient,
  type SupabaseClient,
  type SupportedStorage,
} from "@supabase/supabase-js";

export type PxSupabaseClient = SupabaseClient;

export type CreateClientOptions = {
  /**
   * Storage do token de sessão. No mobile, passar o adapter cifrado
   * (LargeSecureStore); no browser o padrão do supabase-js já serve.
   */
  storage?: SupportedStorage;
  /** true no web (fluxo de confirmação por URL); false no mobile. */
  detectSessionInUrl?: boolean;
};

/**
 * Fábrica única do client Supabase usada por web e mobile — a camada de
 * comunicação app↔Supabase passa toda por aqui.
 */
export function createPxSupabaseClient(
  url: string,
  anonKey: string,
  options: CreateClientOptions = {},
): PxSupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      storage: options.storage,
      detectSessionInUrl: options.detectSessionInUrl ?? false,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
