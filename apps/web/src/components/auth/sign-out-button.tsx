"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="glass flex w-full items-center justify-center gap-2 rounded-[1.75rem] py-4 text-sm font-medium text-[oklch(0.72_0.17_32)] transition-colors hover:bg-white/[0.03] disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />
      ) : (
        <LogOut className="h-4 w-4" strokeWidth={2.25} />
      )}
      Sair da conta
    </button>
  );
}
