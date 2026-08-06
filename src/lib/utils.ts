import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isNavActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export const inputFieldClass =
  "h-11 rounded-xl border-white/10 bg-white/[0.04] px-4 text-[15px] focus-visible:border-primary/40 focus-visible:ring-primary/30";

export function formatDelta(value: number, goodDirection: "up" | "down" = "down") {
  const isPositive = value > 0;
  const isGood = goodDirection === "down" ? !isPositive : isPositive;
  const sign = isPositive ? "+" : "";
  return {
    text: `${sign}${value.toFixed(1)}`,
    isGood,
  };
}
