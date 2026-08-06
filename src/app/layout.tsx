import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Px GYM",
  description: "Avaliação corporal, progressão de carga e nutrição em um só lugar.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#181a1e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        {/*
          THESIS: progression is the interface — every screen leads with the number that changed, not a static form shell.
          OWN-WORLD: near-black layered ground (oklch 0.15), glass cards (white/[0.03] + backdrop-blur + hairline border),
            one committed volt-lime accent (oklch 0.87 0.23 126) for progress/primary action, coral/amber/violet reserved
            for protein/carbs/fat data-coding only. Geist Sans for UI, Geist Mono for every numeric readout (kg, reps, kcal, %).
          STORY: user opens to "what changed since last time" (body comp delta, workout progress, kcal remaining), acts in one
            tap (check a set, log a meal), sees the number move immediately.
          FIRST VIEWPORT: greeting + week strip, then body-composition hero (weight/BF%/lean mass + trend line) beside a
            measurements card, then workout-today and nutrition-today cards below — primary action always bottom-right of its card.
          FORM: brief-pinned direction (dark/glassmorphism/vibrant-accent, user-supplied Dribbble reference) — concept-seed
            roll skipped per SKILL.md "brief wins"; disclosed to user in-session.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.
        */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        >
          <div className="absolute -top-56 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-primary/[0.05] blur-[120px]" />
          <div className="absolute -bottom-24 right-[-10rem] h-[22rem] w-[22rem] rounded-full bg-[oklch(0.72_0.17_32_/_0.06)] blur-[120px]" />
        </div>
        <div className="relative z-10 min-h-full">{children}</div>
      </body>
    </html>
  );
}
