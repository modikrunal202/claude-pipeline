# Default Design Baseline

> Owner: `frontend-engineer` agent. Used automatically when a feature has **no** design doc, mockup, Figma link, or existing design-token/component library to follow. This is a fallback, not a house style to prefer over real design input — a real design spec, existing component library, or design-tokens file always overrides this file.
>
> Goal: a UI that a human would call "clean and consistent" by default — never a bare, unstyled, or visually inconsistent build just because no designer was in the loop.

## When this applies

Before implementing any UI, check for design input in this order:
1. A design doc/spec/mockup/Figma reference passed for this task → follow it.
2. An existing design-tokens file, theme config, or component library already in the repo (e.g. `tailwind.config.*`, `theme.ts`, a `components/ui` folder, a storybook) → follow its conventions, don't invent new ones.
3. Neither exists → apply this baseline, and say so explicitly in the handoff ("no design doc found — implemented against the default design baseline").

Never silently invent ad hoc colors, spacing, or type sizes when neither #1 nor #2 exists — use the tokens below so output is consistent across features and sessions.

## Color tokens

Use a small neutral-first palette. One accent color (ask the user for a brand color if known; otherwise use the default below).

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#ffffff` / `#0b0d10` (dark) | page background |
| `--color-surface` | `#f7f8f9` / `#15181c` (dark) | cards, panels |
| `--color-border` | `#e2e5e8` / `#2a2f36` (dark) | dividers, input borders |
| `--color-text` | `#14181c` / `#e8eaed` (dark) | primary text |
| `--color-text-muted` | `#5c6470` / `#9aa4b1` (dark) | secondary text |
| `--color-accent` | `#3b6fed` | primary actions, links, focus rings |
| `--color-accent-hover` | `#2f5bd0` | hover state of accent |
| `--color-success` | `#1b8a5a` | success states |
| `--color-warning` | `#b8790c` | warning states |
| `--color-danger` | `#c23a3a` | destructive actions, errors |

Body text on background must meet WCAG AA contrast (4.5:1 normal text, 3:1 large text/UI components). Support both a light and dark variant using the pairs above — don't hardcode one theme only.

## Typography

Single system font stack (no custom font loading unless the project already has one):
`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

| Role | Size | Weight | Line-height |
|---|---|---|---|
| Display / H1 | 2rem (32px) | 600 | 1.2 |
| H2 | 1.5rem (24px) | 600 | 1.25 |
| H3 | 1.25rem (20px) | 600 | 1.3 |
| Body | 1rem (16px) | 400 | 1.5 |
| Small / caption | 0.875rem (14px) | 400 | 1.4 |

Never go below 14px for body text. Line length ~60-80 characters for paragraphs.

## Spacing & layout

8px base grid. Use only these steps: `4, 8, 12, 16, 24, 32, 48, 64` (px). No arbitrary one-off values (`13px`, `27px`).

- Page content max-width: `1200px`, centered, with `24px` horizontal padding on mobile.
- Card/panel padding: `24px` (desktop), `16px` (mobile).
- Gap between stacked sections: `32-48px`.
- Gap between related inline elements (icon+label, form field group): `8px`.

Responsive breakpoints: mobile `< 640px`, tablet `640-1024px`, desktop `> 1024px`. Every layout must be checked at all three.

## Component defaults

- **Border radius:** `8px` for cards/inputs/buttons, `4px` for small chips/tags, `9999px` for pills/avatars.
- **Shadows:** one subtle elevation for raised surfaces (`0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`). Avoid heavy/multiple shadow layers.
- **Buttons:** min height `40px`, horizontal padding `16px`, radius `8px`. Primary = filled accent; secondary = outlined/neutral; destructive = danger color. Always implement `:hover`, `:focus-visible` (visible ring, never `outline: none` without a replacement), `:disabled` (reduced opacity, no pointer events), and a loading state for async actions.
- **Inputs:** min height `40px`, `1px` border in `--color-border`, radius `8px`, clear focus ring in accent color, visible label (not placeholder-only), inline error message below the field in danger color tied via `aria-describedby`.
- **Cards:** surface background, `1px` border or subtle shadow (pick one, not both heavily), consistent internal padding per the spacing scale above.
- **Empty/loading/error states:** every list/data view must render a designed empty state (icon/text/optional CTA), a skeleton or spinner for loading, and a retry-capable error state — never a blank screen.

## Motion

Keep transitions short and purposeful: `150-200ms ease-out` for hover/focus/color changes, `200-250ms` for layout/panel transitions. Respect `prefers-reduced-motion`.

## Accessibility floor

- Semantic HTML elements before ARIA.
- All interactive elements keyboard-reachable with a visible focus indicator.
- Color is never the only signal (pair with icon/text for status).
- Meets WCAG AA contrast per the color table above.

## How to use this baseline

Implement it as real design tokens in the project's existing styling system (CSS variables, Tailwind config, styled-components theme, etc.) — don't hardcode raw hex/px values scattered through components. If the project has no styling system yet, add a minimal tokens file (e.g. `tokens.css` or a theme object) using the values above so later features stay consistent with this one.
