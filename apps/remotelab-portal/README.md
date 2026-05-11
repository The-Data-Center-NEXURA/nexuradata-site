# NEXURA RemoteLab Portal (React)

> Customer-facing portal described in `docs/REMOTELAB-PRODUCT-BRIEF.md`.
> Current state: **source dropped, not yet wired into a build.**

## What's here

- `src/NexuraClientPortal.jsx` — full multi-step portal (intake →
  assessment → session → consent → diagnostic → result), with demo
  fallback when the API is unreachable.

## Stack expected (from the brief)

- React + Vite (or Next.js)
- Tailwind CSS
- `framer-motion`, `lucide-react`
- shadcn/ui (`@/components/ui/{card,button}`)
- Calls `VITE_API_BASE_URL` (default `http://localhost:8787`)

## API contract consumed

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/cases` | Create client + case + initial triage |
| POST | `/api/sessions` | Issue a temporary signed RemoteLab session |
| POST | `/api/consent` | Record customer consent for the session |
| POST | `/api/agent/diagnostics` | Receive diagnostic payload (browser, cloud, or device agent) |
| POST | `/api/reports/cases/:caseId` | Generate a customer-facing report |
| POST | `/api/cases/:caseId/opportunities/rebuild` | Re-derive monitor / lab / quote opportunities |

## Gap with current site stack

The rest of the repo is **vanilla HTML + Cloudflare Pages Functions
(ESM)**, with API routes under `functions/api/remotefix/*`. Path names
and the runtime model differ from the brief:

| Brief | Current repo |
|---|---|
| `/remotelab` page | `/remotefix.html` (FR + EN) |
| `api.nexuradata.ca` separate Node/Express service | Same-origin Cloudflare Pages Functions |
| `/api/cases`, `/api/sessions`, `/api/consent`, `/api/agent/diagnostics` | `/api/remotefix/cases`, `/sessions`, `/consent`, `/diagnostics` |
| Brand: **RemoteLab** | Code says **RemoteFix** |

These are decisions for the next session. Options:

1. **Keep Cloudflare Pages Functions, rebrand & realign paths** — cheap,
   keeps one runtime, ships fastest.
2. **Stand up a real `api.nexuradata.ca` Node/Express service** — matches
   the brief verbatim, but doubles ops surface. Cloudflare Pages can
   still host the React portal.
3. **Hybrid** — keep Pages Functions as the API origin, add Vite build
   for `apps/remotelab-portal`, mount it at `/remotelab/*`.

Until that decision lands, do **not** edit `NexuraClientPortal.jsx`
ad-hoc — keep it as the canonical UI reference the founder approved.
