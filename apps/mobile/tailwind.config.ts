import type { Config } from "tailwindcss";
import { colors, glass, radius, spacing } from "@px/tokens";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        volt: colors.voltLime,
        ground: colors.inkGround,
        surface: colors.inkSurface,
        paper: colors.paperForeground,
        fog: colors.fogMuted,
        protein: colors.proteinCoral,
        carbs: colors.carbsAmber,
        fat: colors.fatViolet,
        alert: colors.alertRed,
        hairline: colors.hairlineBorder,
        "glass-fill": glass.fill,
        "glass-strong": glass.fillStrong,
        "glass-track": glass.track,
      },
      borderRadius: {
        "px-sm": `${radius.sm}px`,
        "px-md": `${radius.md}px`,
        "px-lg": `${radius.lg}px`,
        "px-xl": `${radius.xl}px`,
      },
      spacing: {
        "px-xs": `${spacing.xs}px`,
        "px-sm": `${spacing.sm}px`,
        "px-md": `${spacing.md}px`,
        "px-lg": `${spacing.lg}px`,
        "px-xl": `${spacing.xl}px`,
      },
      fontFamily: {
        sans: ["Geist_400Regular"],
        "sans-medium": ["Geist_500Medium"],
        "sans-semibold": ["Geist_600SemiBold"],
        mono: ["GeistMono_600SemiBold"],
      },
    },
  },
  plugins: [],
} satisfies Config;
