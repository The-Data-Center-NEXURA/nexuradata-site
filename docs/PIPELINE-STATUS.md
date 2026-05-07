# NEXURA pipeline status — 13-stage audit

Stage-by-stage map of the canonical client funnel against what is shipped today
(Cloudflare Pages Functions + Neon `0001`–`0003` schemas) versus what only
exists as a spec under `apps/` and `migrations/neon/0004_remotelab_platform.sql`.

Legend: ✅ live · 🟡 partial · ⛔ spec only (not wired) · 🚫 blocked.

| # | Stage | Status | Where it lives | Gap |
|---|-------|--------|----------------|-----|
| 1 | Client intake | ✅ | [functions/api/intake.js](../functions/api/intake.js), [functions/_lib/cases.js](../functions/_lib/cases.js) (Turnstile + consent gate) | — |
| 2 | AI / rules triage | ✅ | [functions/api/diagnostic.js](../functions/api/diagnostic.js), [functions/api/concierge.js](../functions/api/concierge.js) (gpt-4o-mini + tool call), [functions/_lib/automation.js](../functions/_lib/automation.js) | — |
| 3 | Risk score | ✅ | `automation.js` `riskLevel ∈ {standard, priority, critical, high}`; surfaced as `priorityIntake` in concierge | — |
| 4 | Secure session | ✅ | `intake.js` issues case number + access code (HMAC, [functions/_lib/access-code.js](../functions/_lib/access-code.js)); RemoteFix sessions in [functions/_lib/remotefix.js](../functions/_lib/remotefix.js) | — |
| 5 | Consent | ✅ | Intake form `consentement` boolean; RemoteFix `remoteFixConsentSchema` + `/api/remotefix/consent` | — |
| 6 | Email link | ✅ | Resend via [functions/_lib/email.js](../functions/_lib/email.js) (intake confirmation + status link) | — |
| 7 | Case creation | ✅ | `intake.js` → `cases` table (`0001_full_schema.sql`) | — |
| 8 | Quote generation | 🟡 | [functions/api/ops/quotes.js](../functions/api/ops/quotes.js), [functions/api/ops/quote-pdf.js](../functions/api/ops/quote-pdf.js) (operator-driven, Cloudflare Access) | No client-portal accept/decline route; no `service_opportunities → quote` auto-generation (spec in 0004) |
| 9 | Payment | ✅ | [functions/api/stripe-webhook.js](../functions/api/stripe-webhook.js), [functions/api/ops/payments.js](../functions/api/ops/payments.js), [functions/_lib/stripe.js](../functions/_lib/stripe.js) | — |
| 10 | Report generation | ⛔ | Spec only: `generated_reports` table in `0004`. `apps/remotelab-api` defines `POST /api/reports/cases/:caseId` | Migration 0004 not applied; no Pages Function. Need port from spec |
| 11 | Lab escalation | 🟡 | `automation.js` emits `lab_required` flag in case timeline; ops console renders it | No dedicated `cases.status='lab_required'` workflow endpoint or escalation email template |
| 12 | Monitoring upsell | ⛔ | Spec only: `monitoring_*` + `health_alerts` tables in `0004`. `apps/remotelab-portal` + admin console UI | No agent ingestion endpoint, no plan signup, no Stripe subscription wiring |
| 13 | Admin dashboard | 🟡 | [operations/index.html](../operations/index.html) + [functions/api/ops/cases.js](../functions/api/ops/cases.js) (Cloudflare Access). React reference: [apps/remotelab-portal/src/NexuraAdminConsole.jsx](../apps/remotelab-portal/src/NexuraAdminConsole.jsx) | No `/api/admin/dashboard` or `/api/admin/opportunities` Pages Functions yet (only spec in `apps/remotelab-api`) |

## Blockers

- 🚫 **Migration `0004_remotelab_platform.sql`** is committed but NOT applied to
  Neon (local `.dev.vars` `DATABASE_URL` returns `password authentication failed`).
  Stages 10 / 12 / parts of 8 + 13 cannot be wired until the migration runs.
  Apply via Neon web console or refresh the local credential and run
  `psql "$DATABASE_URL" -f migrations/neon/0004_remotelab_platform.sql`.

## Recommended next moves (scoped, in order)

1. Apply migration `0004` to Neon (unblocks 10 / 12 / 13).
2. Port `apps/remotelab-api` admin endpoints to Pages Functions under
   `functions/api/admin/` (`dashboard.js`, `opportunities/index.js`,
   `opportunities/[id].js`), all behind Cloudflare Access.
3. Add `functions/api/reports/cases/[id].js` for stage 10 (markdown report from
   case + automation plan; archive in `generated_reports`).
4. Add Monitor agent ingest (`functions/api/monitoring/agents/[id]/heartbeat.js`)
   + Stripe subscription product for stages 12 + 9 recurring.
5. Wire the React `NexuraAdminConsole` reference into a built `apps/` workspace
   only when stages 1–4 above are live. Until then it stays an unbuilt spec.

## RemoteLab browser-portal flow

Maps the canonical funnel sketch to the live RemoteFix code paths. Everything
in this flow is already shipped except where flagged.

```
Client visits nexuradata.ca
        ↓
RemoteLab browser portal opens          → /remotefix.html (publicly linked)
        ↓
Client describes problem                 → form posts to /api/remotefix/cases
        ↓
Backend creates case in Neon             → functions/api/remotefix/cases.js
                                           + functions/_lib/remotefix.js
                                             createRemoteFixCase()
        ↓
Backend classifies risk                  → remoteFixCaseSchema → triage
                                           (riskLevel, allowedActions,
                                           requiresHumanApproval)
        ↓
┌─ Browser / cloud is enough?
│      ↓ yes
│   Continue without install             → actionPolicy.read_*
│   (read-only diagnostics, cloud        + safe_repair after consent +
│    metadata, Outlook profile, etc.)    payment. Driven by
│                                          functions/api/remotefix/
│                                            diagnostics.js, commands.js
│
├─ Local diagnostics needed?
│      ↓ yes
│   Offer optional Win/macOS/Linux       → agentDiagnosticSchema +
│   agent download                          functions/api/remotefix/admin.js
│   (deviceTypes: windows_pc,               (token-bound, time-limited,
│   mac, linux, nas_server, …)              consent-gated)
│
└─ Risky?
       ↓ yes
   No agent repair, send to lab          → actionPolicy entries with
   (format, chkdsk_write, partition_       category:"dangerous" force
   write, raid_rebuild, firmware_reset,    requiresHumanApproval=true and
   restore_to_same_disk, …)                cannot run remotely. Case is
                                           flagged lab_required and routed
                                           to /api/intake → standard lab
                                           workflow.
```

Notes:

- Consent is mandatory before any non-read action: `remoteFixConsentSchema`
  + `/api/remotefix/consent` (status `waiting_for_consent` → `consent_given`).
- Payment is required before any `safe_repair` runs: `requiresPayment:true`
  in `actionPolicy` enforced by [functions/api/remotefix/payments.js](../functions/api/remotefix/payments.js).
- All commands are signed and time-bound; nothing executes without an active
  session token (`hashRemoteToken`, `generateRemoteToken`).
- The Win/macOS/Linux agent itself is a separate deliverable — endpoints exist
  to receive its uploads, but the binary is not in this repo.

## v2 surface-area target (spec) vs current

| Surface | v2 target | Today | Delta |
|---------|-----------|-------|-------|
| Client portal | `nexuradata.ca/remotelab` (React `NexuraClientPortal.jsx`) | `nexuradata.ca/remotefix` (vanilla HTML/JS, [remotefix.html](../remotefix.html)) | Add `/remotelab` redirect → `/remotefix` until React app is built; or build `apps/remotelab-portal` and serve at `/remotelab/*` |
| Admin console | (not in spec, but [`apps/.../NexuraAdminConsole.jsx`](../apps/remotelab-portal/src/NexuraAdminConsole.jsx) exists) | [operations/index.html](../operations/index.html) behind Cloudflare Access | Keep `operations/` as canonical until React admin is wired |
| API | `api.nexuradata.ca` (separate Node/Express + Neon) | `nexuradata.ca/api/*` (Cloudflare Pages Functions + Neon HTTP) | The Pages Functions architecture is preferred (single origin, no extra infra). `apps/remotelab-api` is a porting reference, not a deployment target. Do NOT spin up a second origin. |
| Database | Neon Postgres | Neon Postgres | ✅ same |
| Agent downloads | `nexuradata.ca/downloads/remotelab-agent-windows.exe` · `…-macos.dmg` · `…-linux.AppImage` | not present | Create `/downloads/` area + `_redirects` entries when binaries are signed and ready. Do NOT commit empty placeholder binaries — they would be served to users. |

### Recommended posture

1. **Keep one origin**. Reject `api.nexuradata.ca` as a separate service —
   Pages Functions already provide everything the spec describes, and a second
   origin doubles secret/Access surface. Treat `apps/remotelab-api/` strictly
   as a porting reference for endpoint shape.
2. **Alias `/remotelab` → `/remotefix`** in `_redirects` once the team agrees
   on the public name; do not duplicate the portal.
3. **Agent downloads** must wait until: (a) binaries are code-signed
   (Authenticode for Windows, Apple notarization for macOS, gpg-signed
   AppImage for Linux), (b) checksums + signatures published on the same page,
   (c) update channel decided. Until then, link to a "coming soon" stub, not a
   binary.


