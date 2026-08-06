"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame } from "lucide-react";
import { cn, isNavActive } from "@/lib/utils";
import { navItems } from "@/lib/nav";
import { user as mockUser } from "@/lib/mock-data";
import type { SessionUser } from "@/lib/auth";

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-[oklch(0.12_0.006_264)] px-5 py-7 lg:flex">
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
          Px
        </span>
        <span className="text-lg font-semibold tracking-tight">Px GYM</span>
      </Link>

      <nav className="mt-10 flex flex-1 flex-col gap-1.5">
        {navItems.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-colors",
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute inset-0 rounded-2xl bg-primary" />
              )}
              <Icon className="relative z-10 h-[18px] w-[18px]" strokeWidth={2.25} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="glass flex items-center gap-3 rounded-2xl px-3.5 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
          {user.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{mockUser.goal}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-[oklch(0.72_0.17_32_/_0.15)] px-2 py-1 text-[oklch(0.78_0.15_50)]">
          <Flame className="h-3 w-3" strokeWidth={2.5} />
          <span className="font-mono text-[11px] font-semibold">{mockUser.streakDays}</span>
        </div>
      </div>
    </aside>
  );
}
