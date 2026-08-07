import type { Session } from "@supabase/supabase-js";

/**
 * Nome exibível a partir da sessão: user_metadata.name quando existir (o
 * cadastro ainda não coleta nome), senão o prefixo do e-mail capitalizado.
 */
export function displayName(session: Session | null): string {
  if (!session) return "Atleta";
  const fromMetadata = session.user.user_metadata?.name;
  if (typeof fromMetadata === "string" && fromMetadata.trim()) {
    return fromMetadata.trim();
  }
  const prefix = session.user.email?.split("@")[0] ?? "Atleta";
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PX";
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}
