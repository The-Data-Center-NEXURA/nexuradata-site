---
description: "Use when writing HTML, CSS, or JS for the NEXURADATA site. Covers design tokens, typography, layout, forms, animation, and editorial rules. Triggers on: styling, CSS, layout, new page, component, section, form, animation."
applyTo: "**/*.{html,css,js}"
---
# NEXURADATA Design System

## Structure
- Semantic HTML only — `<main>`, `<section>`, `<nav>`, `<footer>`. No unnecessary `<div>`.
- Single CSS file (`assets/css/site.css`), no framework.
- No JS except for form logic and static UI state (`assets/js/site.js`).
- Typography: IBM Plex Sans for body, headings, and UI; IBM Plex Mono for eyebrows, labels, and technical readouts. Fonts loaded from Google Fonts (`fonts.googleapis.com`).
- No automatic motion: no autoplay media, CSS animations, scroll reveal, smooth scrolling, animated counters, or hover lifts.

## CSS Tokens

Branding tokens are **locked** — see `.github/instructions/branding.instructions.md`. The site CSS also defines layout/functional tokens:

```css
:root {
  /* Locked branding (do not change) */
  --noir: #0d0d0b;
  --os: #e8e4dc;
  --os-dim: rgba(232, 228, 220, 0.22);
  --os-ghost: rgba(232, 228, 220, 0.08);
  --rule: 0.5px solid rgba(232, 228, 220, 0.1);
  --serif: 'IBM Plex Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --tracking-wide: 0.35em;
  --tracking-xwide: 0.55em;

  /* Layout tokens (may be adjusted) */
  --color-bg: #0d0d0b;
  --color-text: #e8e4dc;
  --color-text-soft: rgba(232, 228, 220, 0.65);
  --color-text-muted: rgba(232, 228, 220, 0.38);
  --color-accent: #e8e4dc;
  --color-accent-ink: #0d0d0b;
  --shadow-soft: 0 14px 32px -28px rgba(0, 0, 0, 0.48);
  --radius-sm: 1rem;
  --radius-md: 1.5rem;
  --radius-lg: 2rem;
  --width-content: min(1160px, calc(100% - 3rem));
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
```

## Reset
```css
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0; min-width: 320px;
  font-family: var(--font-sans);
  color: var(--os); background: var(--noir);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
}
```

## Typography
- Body text uses `var(--font-sans)` (IBM Plex Sans).
- Subdued text uses `opacity` values (0.65, 0.38) — aligned with branding tokens `--os-dim` and `--os-ghost`.
- Nav links and labels use `letter-spacing: var(--tracking-xwide)` at `font-size: 0.75rem`.

## Header & Footer
Header and footer are **locked branding blocks** — see `.github/instructions/branding.instructions.md`. Use `<nav class="site-nav">` (not `.navbar`) on public pages. Logo is always `/assets/nexuradata-master.svg`.

## Buttons
```css
.button {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  min-height: 3.25rem; padding: 0.9rem 1.4rem;
  border: 1px solid transparent; border-radius: 1rem 1rem 1rem 0.35rem;
  font-weight: 800; letter-spacing: -0.02em; text-decoration: none;
}
.button-primary   { background: var(--os); color: var(--noir); }
.button-secondary { border-color: var(--os-dim); background: rgba(13,13,11,0.96); color: var(--os); }
.button-outline   { border-color: var(--os-dim); color: var(--os); background: rgba(13,13,11,0.94); }
```

## Forms
```css
.field input, .field select, .field textarea {
  width: 100%; min-height: 3.15rem; padding: 0.9rem 1rem;
  border: 1px solid var(--os-ghost); border-radius: 1rem;
  background: rgba(13,13,11,0.98); color: var(--os);
}
.field input:focus, .field textarea:focus {
  outline: none; border-color: var(--os-dim);
  box-shadow: 0 0 0 4px var(--os-ghost);
}
.consent-check {
  display: flex; gap: 0.8rem; align-items: flex-start;
  padding: 1rem 1.05rem; border: 1px solid var(--os-ghost);
  border-radius: 1rem; background: rgba(13,13,11,0.92);
}
```

## Legal / Shell Pages
Legal pages (mentions-legales, politique-confidentialite, conditions-intervention-paiement) use:
```css
.page-shell   /* full-page wrapper */
.page-hero    /* top hero section with h1 */
.page-grid    /* max-width content grid */
.page-card    /* surface panel for card blocks */
.page-content /* prose container inside cards */
.page-links   /* footer link list */
```
- Always include `<link rel="canonical">`, `<link rel="alternate" hreflang>` pairs.

## Motion
Do not add automatic motion. Keep interactions immediate and static: no autoplay media, CSS animations, smooth scrolling, scroll reveal, animated counters, or hover lifts.

## Editorial Rules
- Never more than 2 levels of visual hierarchy per section.
- Titles in sentence case — never all-caps except nav items and label eyebrows.
- Subdued text uses `var(--os-dim)` or `opacity` (0.65 / 0.38) — consistent with branding tokens.
- Sections separated by border + surface gradient — not background color swaps.
- Asymmetric corner radius (`1rem 1rem 1rem 0.35rem`) is the signature shape for buttons and interactive elements.
