"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { inputFieldClass as fieldClass } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="glass rounded-[1.75rem] p-7">
      <h1 className="text-xl font-semibold tracking-tight">Entrar</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Acesse seu painel de treino e nutrição.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
          />
        </div>

        {error && <p className="text-sm text-[oklch(0.72_0.17_32)]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
          ) : (
            <LogIn className="h-4 w-4" strokeWidth={2.5} />
          )}
          Entrar
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
