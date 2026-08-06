import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MacroRingProps = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor?: string;
  className?: string;
  children?: ReactNode;
};

export function MacroRing({
  progress,
  size = 120,
  strokeWidth = 10,
  color,
  trackColor = "oklch(1 0 0 / 8%)",
  className,
  children,
}: MacroRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const offset = circumference * (1 - clamped);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
