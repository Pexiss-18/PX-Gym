import { Bell, Flame } from "lucide-react";
import { user as mockUser } from "@/lib/mock-data";
import type { SessionUser } from "@/lib/auth";

export function TopBar({ user }: { user: SessionUser }) {
  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const firstName = user.name.split(/\s+/)[0];

  return (
    <header className="flex items-center justify-between px-5 pt-6 pb-2 lg:px-10 lg:pt-8">
      <div>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight lg:text-[28px]">
          Olá, {firstName}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="glass hidden items-center gap-1.5 rounded-full px-3 py-2 text-[oklch(0.78_0.15_50)] sm:flex">
          <Flame className="h-4 w-4" strokeWidth={2.5} />
          <span className="font-mono text-sm font-semibold">{mockUser.streakDays} dias</span>
        </div>
        <button
          type="button"
          aria-label="Notificações"
          className="glass flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-foreground"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={2.25} />
        </button>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-xs font-semibold lg:hidden">
          {user.initials}
        </span>
      </div>
    </header>
  );
}
