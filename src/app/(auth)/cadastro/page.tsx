"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { inputFieldClass as fieldClass } from "@/lib/utils";

export default function CadastroPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "Esse e-mail já tem uma conta."
          : "Não foi possível criar a conta. Tente novamente.",
      );
      setLoading(false);
      return;
    }

    if (!data.session) {
      setPendingConfirmation(true);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (pendingConfirmation) {
    return (
      <div className="glass rounded-[1.75rem] p-7 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Confirme seu e-mail</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviamos um link de confirmação para <span className="text-foreground">{email}</span>.
          Depois de confirmar, volte e entre normalmente.
        </p>
        <Link
          href="/login"
          className="mt-6 flex items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="glass rounded-[1.75rem] p-7">
      <h1 className="text-xl font-semibold tracking-tight">Criar conta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Comece a acompanhar seu treino e nutrição.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />
        </div>
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
            autoComplete="new-password"
            required
            minLength={6}
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
            <UserPlus className="h-4 w-4" strokeWidth={2.5} />
          )}
          Criar conta
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
