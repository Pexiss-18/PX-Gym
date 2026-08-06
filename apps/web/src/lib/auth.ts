import type { User } from "@supabase/supabase-js";

export type SessionUser = {
  name: string;
  email: string;
  initials: string;
};

export function toSessionUser(user: User): SessionUser {
  const metadataName = (user.user_metadata?.full_name as string | undefined)?.trim();
  const name = metadataName || user.email?.split("@")[0] || "Usuário";
  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  return { name, email: user.email ?? "", initials };
}
