import type { Sessao } from "@px/core";

/** Nome exibível: o que a sessão traz (o gateway já resolve metadata/e-mail). */
export function displayName(sessao: Sessao | null): string {
  return sessao?.usuario.nome.trim() || "Atleta";
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PX";
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}
