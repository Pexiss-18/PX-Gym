import { Terminal } from "lucide-react";

const steps = [
  {
    title: "Crie um projeto no Supabase",
    detail: "supabase.com → New project. Copie a Project URL e a anon public key em Settings → API.",
  },
  {
    title: "Rode a migration",
    detail: "Cole o conteúdo de supabase/migrations/0001_assessments.sql no SQL Editor do painel e execute.",
  },
  {
    title: "Crie uma API key da Anthropic",
    detail: "console.anthropic.com → API Keys.",
  },
  {
    title: "Preencha o .env.local",
    detail:
      "Copie .env.local.example para .env.local e preencha NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e ANTHROPIC_API_KEY. Reinicie o servidor.",
  },
];

export default function SetupPage() {
  return (
    <div className="relative z-10 flex min-h-full items-center justify-center px-5 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
            Px
          </span>
          <span className="text-lg font-semibold tracking-tight">Px GYM</span>
        </div>

        <div className="glass rounded-[1.75rem] p-7">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Terminal className="h-4 w-4" strokeWidth={2.25} />
            <span className="text-sm font-medium">Configuração necessária</span>
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">
            Faltam as credenciais do Supabase
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            O login, o upload de avaliações e a geração de dieta por IA precisam de um backend
            configurado. Siga os passos abaixo:
          </p>

          <ol className="mt-6 flex flex-col gap-4">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] font-mono text-xs font-semibold">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
