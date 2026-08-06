/**
 * Px GYM design tokens — fonte única da identidade visual definida em DESIGN.md.
 *
 * Os valores hex foram convertidos dos oklch canônicos do DESIGN.md com culori
 * (clampChroma pra dentro do gamut sRGB). O web continua usando oklch direto no
 * CSS; estes hex existem porque React Native não interpreta oklch.
 */

export const colors = {
  /** oklch(0.87 0.23 126) — o único acento. Progresso e ação primária, nada mais. */
  voltLime: "#b0ec00",
  /** oklch(0.15 0.006 264) — fundo da página, quase-preto frio. */
  inkGround: "#0a0b0e",
  /** oklch(0.2 0.008 264) — superfície opaca de fallback e texto sobre lime. */
  inkSurface: "#14161a",
  /** oklch(0.97 0.004 264) — texto primário, off-white. */
  paperForeground: "#f4f5f8",
  /** oklch(0.73 0.014 264) — texto secundário sobre vidro. */
  fogMuted: "#a3a8b1",
  /** oklch(0.72 0.17 32) — macro proteína, mapeamento fixo. */
  proteinCoral: "#fd765d",
  /** oklch(0.82 0.15 78) — macro carboidrato. */
  carbsAmber: "#f9b73f",
  /** oklch(0.72 0.14 300) — macro gordura. */
  fatViolet: "#b28fef",
  /** oklch(0.65 0.22 25) — só estado destrutivo/erro. */
  alertRed: "#f94144",
  /** oklch(1 0 0 / 9%) — borda hairline de todo card de vidro. */
  hairlineBorder: "rgba(255, 255, 255, 0.09)",
} as const;

/** Preenchimentos translúcidos do efeito glass (Elevation & Depth do DESIGN.md). */
export const glass = {
  /** Card padrão (.glass): bg-white/[0.03] */
  fill: "rgba(255, 255, 255, 0.03)",
  /** Bottom nav (.glass-strong): bg-white/[0.05] */
  fillStrong: "rgba(255, 255, 255, 0.05)",
  /** Trilha de barra de progresso: bg-white/[0.06] */
  track: "rgba(255, 255, 255, 0.06)",
  /** Trilha de anel de progresso: white 8% */
  ringTrack: "rgba(255, 255, 255, 0.08)",
  /** Única sombra permitida no sistema: separação do bottom nav. */
  navShadow: "rgba(0, 0, 0, 0.4)",
} as const;

/** Raios de borda em px (rem × 16 do DESIGN.md). Nada abaixo de 12. */
export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

/** Escala de espaçamento em px. */
export const spacing = {
  xs: 8,
  sm: 12,
  md: 20,
  lg: 24,
  xl: 40,
} as const;

/**
 * Escala tipográfica em px. A Instrument Rule vive aqui: todo número
 * logado/medido usa `mono` (Geist Mono), toda palavra usa `sans` (Geist) —
 * nunca misturar no mesmo nó de texto.
 */
export const typography = {
  family: {
    sans: "Geist",
    mono: "GeistMono",
  },
  size: {
    display: 28,
    headline: 20,
    body: 14,
    label: 12,
    /** Piso duro: nenhum texto funcional renderiza menor que isso. */
    labelMin: 11,
    readout: 16,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
  },
} as const;

/** Glows ambiente do fundo (5–6% de opacidade, cantos, nunca atrás de texto). */
export const ambient = {
  glowTopLime: "rgba(176, 236, 0, 0.06)",
  glowBottomCoral: "rgba(253, 118, 93, 0.05)",
} as const;
