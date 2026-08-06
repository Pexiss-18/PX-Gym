"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, isNavActive } from "@/lib/utils";
import { navItems } from "@/lib/nav";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 lg:hidden">
      <div className="glass-strong flex w-full max-w-sm items-center justify-between rounded-[1.75rem] px-2 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        {navItems.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium"
            >
              {active && (
                <span className="absolute inset-x-2 inset-y-0 -z-10 rounded-2xl bg-primary/[0.14]" />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                strokeWidth={2.25}
              />
              <span className={active ? "text-primary" : "text-muted-foreground"}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
