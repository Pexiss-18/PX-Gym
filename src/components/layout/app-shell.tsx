import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";
import type { SessionUser } from "@/lib/auth";

export function AppShell({ children, user }: { children: ReactNode; user: SessionUser }) {
  return (
    <div className="relative z-10 min-h-full">
      <Sidebar user={user} />
      <div className="lg:pl-64">
        <TopBar user={user} />
        <main className="px-5 pb-28 pt-2 lg:px-10 lg:pb-12">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
