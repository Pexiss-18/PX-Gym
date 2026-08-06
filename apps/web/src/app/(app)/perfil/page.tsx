import { ChevronRight, Flame, Ruler, Scale, Settings, Target } from "lucide-react";
import { bodyMetrics, user as mockUser } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import { toSessionUser } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

const menu = [
  { icon: Target, label: "Metas e objetivos" },
  { icon: Ruler, label: "Unidades de medida" },
  { icon: Settings, label: "Preferências do app" },
];

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const user = authUser ? toSessionUser(authUser) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="glass flex flex-col items-center gap-3 rounded-[1.75rem] p-8 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-xl font-semibold">
          {user?.initials ?? mockUser.avatarInitials}
        </span>
        <div>
          <p className="text-lg font-semibold">{user?.name ?? mockUser.name}</p>
          {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
          <p className="text-sm text-muted-foreground">Meta: {mockUser.goal}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-[oklch(0.72_0.17_32_/_0.15)] px-3 py-1.5 text-[oklch(0.78_0.15_50)]">
          <Flame className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span className="font-mono text-xs font-semibold">{mockUser.streakDays} dias seguidos</span>
        </div>
      </div>

      <div className="glass grid grid-cols-2 divide-x divide-white/[0.06] rounded-[1.75rem] p-5">
        <div className="flex items-center gap-3 pr-4">
          <Scale className="h-5 w-5 text-primary" strokeWidth={2.25} />
          <div>
            <p className="font-mono text-lg font-semibold">{bodyMetrics.weightKg.toFixed(1)}kg</p>
            <p className="text-xs text-muted-foreground">Peso atual</p>
          </div>
        </div>
        <div className="flex items-center gap-3 pl-4">
          <Target className="h-5 w-5 text-primary" strokeWidth={2.25} />
          <div>
            <p className="font-mono text-lg font-semibold">{bodyMetrics.bodyFatPct.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Gordura corporal</p>
          </div>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-[1.75rem]">
        {menu.map((item, i) => (
          <button
            key={item.label}
            type="button"
            className={`flex w-full items-center gap-3 px-5 py-4 text-left text-sm transition-colors hover:bg-white/[0.03] ${
              i !== menu.length - 1 ? "border-b border-white/[0.06]" : ""
            }`}
          >
            <item.icon className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
            <span className="flex-1">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
          </button>
        ))}
      </div>

      <SignOutButton />
    </div>
  );
}
