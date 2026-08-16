# Theming & Design Tokens

Source of truth: `app/globals.css`. Tailwind v4, CSS-first theming (no `tailwind.config` colors).

## Color tokens

All colors are CSS custom properties in `oklch()`, defined once in `:root` (light) and once in `.dark`, then mapped to Tailwind utilities via the `@theme inline` block. Example: `--primary` → `bg-primary` / `text-primary`.

Available semantic tokens: `background`, `foreground`, `card` (+ `-foreground`), `popover` (+ `-foreground`), `primary` (+ `-foreground`), `secondary` (+ `-foreground`), `muted` (+ `-foreground`), `accent` (+ `-foreground`), `destructive` (+ `-foreground`), `border`, `input`, `ring`, `chart-1..5`, `sidebar*`, plus custom extras: `surface`, `surface-strong`, `border-strong`, `glass`.

## Typography

- `--font-sans: "Manrope"` and `--font-display: "Sora"` are the tokens actually applied (`body` uses `--font-sans`; `h1/h2/h3` use `--font-display`, set in the `@layer base` block).
- `app/layout.tsx` also loads `Geist`/`Geist Mono` via `next/font/google` and attaches their CSS variables to `<html>`, but nothing currently references those variables — they have no visible effect. Don't assume Geist is the active font.

## Spacing & radius

- `--radius: 0.875rem` is the base; `--radius-sm` through `--radius-4xl` are derived from it in `@theme inline`. Use the Tailwind radius utilities (`rounded-lg`, `rounded-2xl`, etc.), not hardcoded pixel/rem radius values.

## Custom utilities (`@utility` in globals.css)

- `text-gradient` — foreground→primary→cyan gradient text (used on hero headings)
- `grid-fade` — faint background grid, fades out toward the bottom
- `ambient-glow` — soft radial primary-colored glow, used behind hero/panels
- `panel-shadow` — the shared elevated-panel shadow (`--shadow-panel`)

Reuse these for any new hero/panel/glow treatment instead of writing new gradient/shadow CSS inline.

## Hard rules

- Never introduce a new raw color (hex, rgb, or a one-off `oklch(...)`) inline in a component. Use an existing token via its Tailwind utility class.
- If a genuinely new semantic color is needed, add it to **both** `:root` and `.dark` in `app/globals.css`, in `oklch`, then register it under `@theme inline` — per the comment block already at the top of that file.
- Always reuse an existing `components/ui/*` primitive and its CVA variants (e.g. `buttonVariants` in `components/ui/button.tsx`) before building a new visual variant by hand with raw className strings.
