# BIMPACC LMS — Design Tokens

> Direction locked 2026-08-25: **"Cobalt Signal"** · typography **Geist Sans/Mono** · full light+dark parity.
> Single source of truth: [app/globals.css](../app/globals.css). This doc explains intent; edit values there.

## Direction

Modern SaaS (Linear/Vercel-like): near-zero-chroma neutral surfaces, hairline borders,
ONE strong indigo-blue accent at hue 264, airy spacing on an 8pt grid, 0.75rem base radius.
Semantic status colors (success/warning/info/destructive) are reserved for state — never decoration.

## Core palette

| Token | Light | Dark |
| --- | --- | --- |
| background | `oklch(1 0 0)` | `oklch(0.155 0.008 264)` |
| card / popover | `oklch(1 0 0)` | `oklch(0.198 0.01 264)` |
| border / input | `oklch(0.925 0.004 264)` | `oklch(1 0 0 / 12%)` · `/16%` |
| muted | `oklch(0.968 0.003 264)` | `oklch(0.262 0.012 264)` |
| muted-foreground | `oklch(0.52 0.01 264)` | `oklch(0.71 0.012 264)` |
| **primary** | `oklch(0.51 0.215 264)` | `oklch(0.68 0.17 264)` |
| ring | = primary | = primary |
| destructive | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |

## Status

success `oklch(0.55 0.14 152)` / warning `oklch(0.72 0.15 75)` / info `oklch(0.55 0.13 245)` (light);
each lightened one step in dark. Foreground pairs defined alongside in globals.css.

## Charts (--chart-1..5)

Validated for ≥3:1 surface contrast, chroma floor, and CVD adjacent-pair separation in BOTH modes.
Light: `0.55 0.20 264` · `0.62 0.13 190` · `0.72 0.15 80` · `0.58 0.19 305` · `0.63 0.19 15`
Dark: `0.66 0.17 264` · `0.66 0.11 190` · `0.64 0.14 75` · `0.62 0.16 300` · `0.65 0.17 20`
Note: light-mode amber slot (chart-3) is ~2.5:1 on card — charts must offer a table view / direct labels when amber carries meaning.

## Surfaces & sidebar

surface-raised/sunken/overlay layer cards above the canvas; sidebar tokens drive AppSidebar.
Dark sidebar sits between background and card so the content region reads forward.

## Rules

1. Never hardcode Tailwind default-palette classes (`text-red-500`, `bg-blue-100`…) — use semantic
   tokens or `brand-*`. Enforced by `npm run lint:palette` (Phase 5).
2. Focus rings: `ring-3 ring-ring/50 focus-visible:` idiom everywhere (one idiom only).
3. Radius: use the derived scale (`rounded-md/lg/xl`) — no arbitrary radii.
4. Motion ≤300ms entrances; `prefers-reduced-motion` kills animation globally.
