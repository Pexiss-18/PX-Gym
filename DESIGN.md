---
name: Px GYM
description: A dark, glass-surfaced training and nutrition tracker where every screen leads with the number that just moved.
colors:
  volt-lime:
    value: "oklch(0.87 0.23 126)"
  ink-ground:
    value: "oklch(0.15 0.006 264)"
  ink-surface:
    value: "oklch(0.2 0.008 264)"
  paper-foreground:
    value: "oklch(0.97 0.004 264)"
  fog-muted:
    value: "oklch(0.73 0.014 264)"
  protein-coral:
    value: "oklch(0.72 0.17 32)"
  carbs-amber:
    value: "oklch(0.82 0.15 78)"
  fat-violet:
    value: "oklch(0.72 0.14 300)"
  hairline-border:
    value: "oklch(1 0 0 / 9%)"
  alert-red:
    value: "oklch(0.65 0.22 25)"
typography:
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  heading:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  readout:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 600
rounded:
  sm: "0.75rem"
  md: "1rem"
  lg: "1.25rem"
  xl: "1.75rem"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1.25rem"
  lg: "1.5rem"
  xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.volt-lime}"
    textColor: "{colors.ink-surface}"
    rounded: "{rounded.full}"
    padding: "0.75rem 1.5rem"
  card-glass:
    backgroundColor: "{colors.paper-foreground}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
---

# Design System: Px GYM

## Overview

**Creative North Star: "The Progress Readout"**

Px GYM reads like the dashboard of a piece of gym equipment reimagined for a phone: dark, low-glare, built to be read mid-set under bad lighting, with one glowing accent that means "this number moved." Every surface is a slab of near-black glass floating over a nearly imperceptible ambient glow — never a bright page, never a loud one. The interface never competes with the data; it exists to make deltas (weight down, load up, macros filling) legible at a glance.

The palette stays disciplined: one committed accent (volt lime) owns progress and primary action everywhere. Nutrition borrows three additional hues, but only as data-encoding for protein/carbs/fat, never as decoration. Numbers get their own typeface (Geist Mono) so a kilogram, a rep count, and a kcal figure always look like instrument readings, distinct from the sans-serif prose around them.

**Key Characteristics:**
- Near-black layered ground with glass cards (backdrop-blur + hairline border), never a solid opaque panel
- One saturated accent (volt lime) carries progress, primary actions, and the active nav state — nowhere else
- Nutrition macros get a fixed three-color code (coral / amber / violet) that never changes meaning across screens
- Every numeric value renders in monospace; every label/heading renders in the UI sans
- Large, confident corner radii (1.25–1.75rem) on every card; primary buttons are full pills

## Colors

Dark-only palette (no light theme); text and surface pairs are tuned for a near-black ground rather than derived from a light/dark toggle.

### Primary
- **Volt Lime** (`oklch(0.87 0.23 126)`): the single accent. Used for the active nav item, primary CTA buttons ("Continuar treino"), progress rings/bars, positive deltas (weight down, streak count), and the weight trend line. Never used decoratively — its presence always signals "progress" or "primary action."

### Secondary (data-coding only, not decorative)
- **Protein Coral** (`oklch(0.72 0.17 32)`): protein macro ring, bar, and legend dot — this mapping is fixed everywhere protein appears.
- **Carbs Amber** (`oklch(0.82 0.15 78)`): carbohydrate macro ring, bar, and legend dot.
- **Fat Violet** (`oklch(0.72 0.14 300)`): fat macro ring, bar, and legend dot.

### Neutral
- **Ink Ground** (`oklch(0.15 0.006 264)`): the page background — a near-black with a faint cool (blue-leaning) cast, never pure `#000`.
- **Ink Surface** (`oklch(0.2 0.008 264)`): opaque card/popover fallback and text-on-lime color (buttons, active nav pill).
- **Paper Foreground** (`oklch(0.97 0.004 264)`): primary text color, off-white rather than pure white.
- **Fog Muted** (`oklch(0.73 0.014 264)`): secondary text — labels, timestamps, meta rows. Tuned deliberately light (not the more common ~60% muted-gray) because it sits on translucent glass over a blurred ground; a darker muted gray reads as failing contrast on this surface.
- **Hairline Border** (`oklch(1 0 0 / 9%)`): the 1px edge on every glass card and input.
- **Alert Red** (`oklch(0.65 0.22 25)`): destructive/error state only (not yet used in a live screen, reserved for future confirmation dialogs).

### Named Rules
**The One Accent Rule.** Volt lime is the only saturated color allowed outside the nutrition module. If a new screen wants a second "loud" color for anything other than protein/carbs/fat data, that's the signal the screen is over-decorated, not under-branded.

## Typography

**Body/Heading Font:** Geist (with `ui-sans-serif, system-ui, sans-serif` fallback)
**Readout Font:** Geist Mono (with `ui-monospace, monospace` fallback)

**Character:** A single, familiar geometric sans carries every label, heading, and button — this is a product surface (Operate mode), not a brand showcase, so legibility and a "this looks like every well-built app" trust signal beat typographic personality. Geist Mono is reserved exclusively for numbers that represent a measurement or count (kg, %, reps, kcal, dates in charts), giving the interface a quiet "instrument readout" texture wherever data appears.

### Hierarchy
- **Display** (600 weight, 1.75rem/28px, tight tracking): page greeting ("Olá, Paulo") and card hero numbers.
- **Headline** (600 weight, 1.25rem/20px): card and section titles ("Avaliação corporal", workout name).
- **Body** (400 weight, 0.875rem/14px): descriptive text, meta rows, exercise/meal item lists.
- **Label** (500 weight, 0.75–0.6875rem/12–11px): eyebrow labels, nav labels, chip text. 11px is the hard floor for any functional label — nothing renders smaller.
- **Readout** (Geist Mono, 600 weight, sizes vary 0.6875rem–1.75rem by context): every kg/%/kcal/rep value and chart axis tick.

### Named Rules
**The Instrument Rule.** Any number the user logged or is tracking (weight, load, reps, macros, calories, streak count) renders in Geist Mono. Any word renders in Geist Sans. The two never mix within the same text node.

## Layout

Two responsive shells share one content model: a fixed 256px (`w-64`) glass sidebar on desktop (`lg:` breakpoint, 1024px+) with icon+label nav and a bottom user card, versus a floating pill-shaped bottom tab bar on mobile/tablet. Main content sits in a `max-w-3xl` (workout/nutrition, single-column task flows) or `max-w-6xl` (dashboard, multi-card grid) container, centered, with `px-5` mobile / `px-10` desktop outer padding.

Card grids collapse to a single column below `lg:` and expand to 2–3 columns above it (dashboard: 3-col hero row, 2-col action row). Vertical rhythm between stacked cards is a consistent `space-y-5` (1.25rem/20px, matching the `md` spacing token). Card internal padding is `p-5`–`p-6` (1.25–1.5rem).

## Elevation & Depth

No drop shadows. Depth comes entirely from glassmorphism: cards are `backdrop-blur-xl` over a translucent white fill (~3–8% opacity depending on emphasis) with a 1px near-white hairline border, floating over an ink-ground page that carries two very low-opacity (5–6%) blurred color fields (lime top, coral bottom) for ambient atmosphere. The bottom mobile nav uses a stronger blur/opacity ("glass-strong") to read clearly over scrolling content beneath it.

### Named Rules
**The No-Shadow Rule.** Elevation is expressed as blur + translucency + border, never `box-shadow`, except the bottom nav's single ambient shadow (`0 8px 30px rgba(0,0,0,0.4)`) which exists only because it must visually separate from scrolling content, not to signal a "raised" card.

## Shapes

Large, soft corners throughout: cards use 1.75rem (`rounded-[1.75rem]`), the outer glass card radius token; nested elements (set rows, macro card rings, menu rows) step down to 1rem–1.25rem; small chips/badges and the primary CTA button are full pills (`rounded-full`). No sharp corners anywhere in the system — this is a deliberate softness that reads as "approachable equipment," not "spreadsheet."

## Components

### Buttons
- **Shape:** full pill (`rounded-full`).
- **Primary:** volt-lime background, ink-surface text, bold weight, used for the single primary action per screen ("Continuar treino"). Scales down slightly on tap (`active:scale-[0.98]`) — the only button press feedback in the system.
- **Icon buttons:** circular glass chip (notification bell, avatar), `h-10 w-10`.
- **Toggle/segmented (meal "Registrar"):** pill, glass/neutral when off, filled volt-lime when on ("Registrado") — state is color, never an icon swap alone.

### Cards / Containers
- **Corner Style:** 1.75rem outer radius (`.glass` utility class).
- **Background:** `bg-white/[0.03]` (default) or `bg-white/[0.05]` (`.glass-strong`, bottom nav only).
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** 1px `oklch(1 0 0 / 9%)` hairline.
- **Internal Padding:** 1.25–1.5rem (`p-5`/`p-6`).

### Progress Indicators
- **Ring:** SVG circular progress (`MacroRing`), volt-lime or macro color stroke over an 8%-opacity white track, center label in Geist Mono.
- **Bar:** track is `bg-white/[0.06]`, fill is a full-width `scaleX()`-transformed div (never an animated `width`, to avoid layout-thrash) with `transform-origin: left` and a 500ms ease-out transition.

### Navigation
- **Desktop sidebar:** fixed left, 256px, icon + label rows; active item gets a solid volt-lime pill behind lime-on-ink-surface text; inactive items are muted-foreground with hover-to-foreground.
- **Mobile bottom nav:** floating centered pill, `.glass-strong`, active item shows a soft lime-tinted background chip behind the icon+label, both colored volt-lime; inactive items muted-foreground.
- Both navs share the same four destinations and icon set (Lucide): Início, Treino, Nutrição, Perfil.

### Set Row (signature component)
The core interaction unit of the workout module: a glass-bordered row with a large circular check toggle (fills volt-lime + a brief scale-bounce on completion), the set's rep target and previous-session load as muted meta text, and a stepper (−/value/+) for logging today's load in 2.5kg increments — no keyboard input during a workout. A parenthetical delta (`+2.5`) appears in volt-lime the moment today's load exceeds the previous session's.

## Do's and Don'ts

### Do:
- **Do** render every logged number (kg, reps, kcal, %, streak days) in Geist Mono.
- **Do** keep volt-lime as the only saturated accent outside the three fixed macro colors.
- **Do** use `transform: scaleX()` (not `width`) for any animated progress-bar fill.
- **Do** keep functional/label text at 11px minimum, even inside compact meta rows.
- **Do** build new progress/completion UI as a ring or a track-and-fill bar consistent with `MacroRing` — never a numeric-only counter as the sole indicator.

### Don't:
- **Don't** introduce a second saturated "brand" color outside the nutrition module — it breaks the One Accent Rule.
- **Don't** use `box-shadow` for elevation; depth comes from blur + translucency only.
- **Don't** place decorative blur/glow shapes directly behind headline or label text — keep them in card corners away from the text column, and keep opacity at 5–7% or lower; higher opacity or direct overlap measurably degrades text contrast on backdrop-blur surfaces.
- **Don't** mix Geist Sans into a numeric readout or Geist Mono into prose/labels.
- **Don't** add sharp corners; the softest radius in the system is 0.75rem.
