# `assets/css/src/` — editable CSS partials

These files are the **authoritative source** for the site's stylesheet.

`assets/css/site.css` is a **generated artifact** produced by
`scripts/build-css.mjs`, which concatenates every `*.css` file in this
folder in lexicographic (`00-…`, `01-…`) order.

## Workflow

1. Edit the partial that owns the section you're changing.
2. Run `npm run build` (the build pipeline rebuilds `site.css` first).
3. Commit both your partial change and the regenerated `site.css`.

Direct edits to `assets/css/site.css` will be silently overwritten on the
next build. The pre-tool guard at `scripts/hooks/css-source-guard.sh`
warns when you attempt this.

## Layout

| Order | File | Approx. lines | Owns |
|-------|------|---------------|------|
| 00 | `00-tokens.css` | 159 | Locked branding tokens (colors, fonts, spacing). |
| 01 | `01-header-nav.css` | 119 | Site header, brand mark, primary nav. |
| 02 | `02-components.css` | 1,702 | Buttons, page sections, shared components. |
| 03 | `03-footer.css` | 772 | Footer grid, legal strip, locked footer styles. |
| 04 | `04-client-portal.css` | 906 | Suivi de dossier client (status / auth / workroom). |
| 05 | `05-ops.css` | 326 | Operator console (filtered views: quotes, payments, follow-up). |
| 06 | `06-process.css` | 113 | Process step cards. |
| 07 | `07-urgency.css` | 61 | Urgency tier badges. |
| 08 | `08-credentials.css` | 48 | Credential / certification cards. |
| 09 | `09-404.css` | 807 | 404 page composition + chrome. |
| 10 | `10-responsive.css` | 145 | Locked branding responsive overrides. |
| 11 | `11-print.css` | 66 | Print stylesheet. |
| 12 | `12-chatbot.css` | 1,250 | IBM-square chatbot dock. |
| 13 | `13-cookie-consent.css` | 139 | Cookie consent + privacy preferences. |
| 14 | `14-whatsapp.css` | 17 | WhatsApp inline link in contact card. |
| 15 | `15-recovery-desk.css` | 154 | NEXURA AI Recovery Desk. |
| 16 | `16-polish-layer.css` | 237 | Editorial polish layer (signature shapes, eyebrow caret, headline mark, focus ring, reduced-motion safeguard). |

The split is byte-identical to the previous monolithic `site.css`
(verified via SHA-256 in `scripts/split-css-once.mjs`). Future
re-organizations should re-verify the hash before being committed.
