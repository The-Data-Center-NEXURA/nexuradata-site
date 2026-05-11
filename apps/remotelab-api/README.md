# `@nexuradata/remotelab-api` — reference TS API (NOT wired)

This package is the **canonical source-of-truth specification** for the NEXURA RemoteLab + Monitor backend, captured verbatim from the founder.

**It is not part of the production runtime.** It is not built, not installed by the root workspace, and not run in CI. Treat it as executable documentation that the production Cloudflare Pages Functions implementation must conform to.

## Why it exists here

The production runtime is **Cloudflare Pages + Pages Functions** (ESM `.js`) talking to **Neon Postgres** via the HTTP/serverless driver in [functions/_lib/db.js](../../functions/_lib/db.js). That choice is locked: there is no second backend host (`api.nexuradata.ca` is **not** part of the architecture).

This Express + `pg.Pool` reference cannot run on Workers as written (the `pg` package needs Node `net`). It exists so:

1. The triage rules, risk scoring, command policy, monitor classifier, opportunity engine, and report generator have one authoritative definition.
2. Each Pages Function can be ported route-by-route from the matching block in `src/server.ts`.
3. Schema decisions in [migrations/neon/](../../migrations/neon/) trace back to the `SCHEMA_SQL` constant in this file.

## Contents

- `src/server.ts` — verbatim founder source. **Do not edit**, do not split into route files, do not extract into `packages/`. This file is the spec; modify the production Pages Functions instead.
- `package.json` / `tsconfig.json` — listed for future reference only. Do not run `npm install` here as part of the root workflow.
- `.env.example` — the env vars the reference expects. Production secrets live in Cloudflare Pages env, not here.

## Endpoint inventory

Incident engine:
- `POST /api/cases`
- `POST /api/sessions`
- `POST /api/consent`
- `POST /api/agent/diagnostics`
- `POST /api/commands`
- `GET  /api/cases/:caseId`
- `GET  /api/catalog`

Monitor:
- `POST /api/monitoring/accounts`
- `POST /api/monitoring/agents/register`
- `POST /api/monitoring/health`
- `GET  /api/monitoring/accounts/:accountId/dashboard`
- `POST /api/monitoring/alerts/:alertId/convert-to-case`

Opportunity engine:
- `POST /api/cases/:caseId/opportunities/rebuild`
- `GET  /api/admin/opportunities`
- `PATCH /api/admin/opportunities/:opportunityId`

Admin / reports / quotes:
- `GET  /api/admin/dashboard`
- `POST /api/reports/cases/:caseId`
- `GET  /api/reports/:reportId`
- `POST /api/opportunities/:opportunityId/quote`

These are ported into `functions/api/remotelab/**` and `functions/api/ops/remotelab/**` per the phased plan.

## Gap analysis vs Cloudflare Pages Functions

| Reference (this file) | Production runtime |
|---|---|
| `pg.Pool` + Node `net` | Neon HTTP/serverless driver (`functions/_lib/db.js`) |
| `express` + middleware | `onRequest…` ESM exports per route file |
| `helmet`, `cors` | Pages `_headers` + per-function CORS helpers |
| `req.ip`, `req.get('user-agent')` | `request.headers.get('cf-connecting-ip')` etc. |
| In-process secrets via `process.env` | `env.*` bindings declared in `wrangler.jsonc` |
| `pool.connect()` transactions | Neon HTTP transactions or per-statement (no long-lived connections on Workers) |
| `helmet()` global | `_headers` file + CSP at the edge |
| `zod` import | Likely OK on Workers (pure ESM); fall back to `functions/_lib/http.js` validation if bundle pressure |

## Env vars

See `.env.example`. Production values are configured in the Cloudflare Pages dashboard, never committed.

- `DATABASE_URL` — Neon Postgres connection string.
- `PORT` — local-only, ignored on Workers.
- `BASE_URL` — used to build `public_url` in `POST /api/sessions`. Maps to a Pages env var in production.
- `COMMAND_SIGNING_SECRET` — HMAC secret for signed agent commands. **Production value lives in Cloudflare Pages env**, declared in `wrangler.jsonc` once Phase C lands.

## Why we are not running it

- Path 1 in the migration plan (Cloudflare Pages + Neon, no second host) is locked.
- Running `npm install` here would add ~150 MB of `node_modules` for a package that ships nothing.
- Any divergence between this reference and the live Pages Functions is resolved by **updating Pages Functions to match this file**, not the other way around.

See [docs/REMOTELAB-PRODUCT-BRIEF.md](../../docs/REMOTELAB-PRODUCT-BRIEF.md) for the product spec and [.github/copilot-instructions.md](../../.github/copilot-instructions.md) for project guardrails.
