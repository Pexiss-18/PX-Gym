import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-full items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
            Px
          </span>
          <span className="text-lg font-semibold tracking-tight">Px GYM</span>
        </div>
        {children}
      </div>
    </div>
  );
}
