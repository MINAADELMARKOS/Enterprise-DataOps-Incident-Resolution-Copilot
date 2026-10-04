# InvestiNator interface system

The app uses a dark cyberpunk control plane. Color, type, spacing, corner cuts, and glow effects live in `apps/web/app/styles/tokens.css`. Layout rules, shared components, and feature patterns are separated into `layout.css`, `components.css`, and `features.css`, imported by `app/globals.css`. Add a token before introducing a new recurring value.

## Foundations

| Role | Token | Value |
| --- | --- | --- |
| Page | `--background` | `#0a0a0f` |
| Text | `--foreground` | `#e0e0e0` |
| Card | `--card` | `#12121a` |
| Elevated surface | `--muted-surface` | `#1c1c2e` |
| Primary / focus | `--accent`, `--ring` | `#00ff88` |
| Secondary | `--accent-secondary` | `#ff00ff` |
| Tertiary | `--accent-tertiary` | `#00d4ff` |
| Border | `--border-color` | `#2a2a3a` |
| Danger | `--destructive` | `#ff3366` |

`--muted-foreground` preserves the supplied palette value. Body copy uses the brighter `--muted` and `--faint` aliases for legibility on black. Headings use Orbitron Variable, body copy uses JetBrains Mono Variable, and labels use Share Tech Mono. All font files are bundled with the frontend. The app has one dark theme.

## Components

- `PageHeading` accepts `hero` for the Command Center's asymmetric hero and short glitch animation. Use it once on a page; regular page titles stay quieter.
- `Panel` accepts `variant="default"`, `"terminal"`, or `"holographic"`; `hoverEffect` is for navigational or exploratory panels. Dense incident evidence should remain stable while reading.
- `.button`, `.button-primary`, `.button-secondary`, `.button-danger`, and `.button-ghost` cover actions. Keep button labels direct and pair color with text so status is never color alone.
- `Badge` owns severity and status tones. Tables scroll horizontally inside `.table-scroll` at narrow widths; never shrink operational IDs to fit.
- `.form-input`, `.form-select`, and `.form-textarea` share their focus treatment. The Investigator composer adds the terminal prompt through `.terminal-input-wrap`.

Corner cuts use `--clip-panel` and `--clip-control` rather than border radii. Neon shadows are tokens, with the brightest glow reserved for calls to action and active focus. The grid and scanlines are CSS overlays with no image request. Lucide icons use a 1.5 px stroke and inherit text color.

## Motion and responsive behavior

Glitch and cursor animations are occasional visual cues. `prefers-reduced-motion: reduce` disables them. Global focus outlines remain visible for keyboard users. Interactive controls are at least 44 px high. The sidebar becomes a labelled mobile menu below 850 px; cards stack, stats become a two column grid, and NerveMap can scroll horizontally on small screens. Keep future feature layouts inside these shared patterns.
