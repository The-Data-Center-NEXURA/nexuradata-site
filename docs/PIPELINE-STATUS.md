# NEXURA pipeline status — 13-stage audit

Stage-by-stage map of the canonical client funnel against what is shipped today
(Cloudflare Pages Functions + Neon `0001`–`0004` schemas).

Legend: ✅ live · 🟡 partial · 🟠 wired but pending DB migration · ⛔ spec only · 🚫 blocked.

| # | Stage | Status | Where it lives | Gap |
|---|-------|--------|----------------|-----|
| 1 | Client intake | ✅ | [functions/api/intake.js](../functions/api/intake.js), [functions/_lib/cases.js](../functions/_lib/cases.js) (Turnstile + consent gate) | — |
| 2 | AI / rules triage | ✅ | [functions/api/diagnostic.js](../functions/api/diagnostic.js), [functions/api/concierge.js](../functions/api/concierge.js) (gpt-4o-mini + tool call), [functions/_lib/automation.js](../functions/_lib/automation.js); public surface: [nexura-recovery-desk-montreal.html](../nexura-recovery-desk-montreal.html) + [assets/js/recovery-desk.js](../assets/js/recovery-desk.js) | — |
| 3 | Risk score | ✅ | `automation.js` `riskLevel ∈ {standard, intermediate, elevated, critical}`; surfaced in Recovery Desk 3-bar meter and concierge `priorityIntake` | — |
| 4 | Secure session | ✅ | `intake.js` issues case number + access code (HMAC, [functions/_lib/access-code.js](../functions/_lib/access-code.js)); RemoteFix sessions in [functions/_lib/remotefix.js](../functions/_lib/remotefix.js) | — |
| 5 | Consent | ✅ | Intake form `consentement` boolean; RemoteFix `remoteFixConsentSchema` + `/api/remotefix/consent` | — |
| 6 | Email link | ✅ | Resend via [functions/_lib/email.js](../functions/_lib/email.js) (intake confirmation + status link) | — |
| 7 | Case creation | ✅ | `intake.js` → `cases` table (`0001_full_schema.sql`) | — |
| 8 | Quote generation | 🟠 | Operator: [functions/api/ops/quotes.js](../functions/api/ops/quotes.js), [functions/api/ops/quote-pdf.js](../functions/api/ops/quote-pdf.js). Auto from opportunities: [functions/_lib/quotes.js](../functions/_lib/quotes.js), [functions/api/opportunities/\[opportunityId\]/quote.js](../functions/api/opportunities/[opportunityId]/quote.js), rebuild trigger: [functions/api/cases/\[caseId\]/opportunities/rebuild.js](../functions/api/cases/[caseId]/opportunities/rebuild.js). Client portal: [functions/api/cases/\[caseId\]/quotes.js](../functions/api/cases/[caseId]/quotes.js), [accept](../functions/api/cases/[caseId]/quotes/[quoteId]/accept.js) / [decline](../functions/api/cases/[caseId]/quotes/[quoteId]/decline.js) | Pending migration `0004` (gracefully 503s) |
| 9 | Payment | ✅ | [functions/api/stripe-webhook.js](../functions/api/stripe-webhook.js), [functions/api/ops/payments.js](../functions/api/ops/payments.js), [functions/_lib/stripe.js](../functions/_lib/stripe.js) | — |
| 10 | Report generation | 🟠 | [functions/_lib/reports.js](../functions/_lib/reports.js), [functions/api/reports/cases/\[caseId\].js](../functions/api/reports/cases/[caseId].js), [functions/api/reports/\[reportId\].js](../functions/api/reports/[reportId].js) | Pending migration `0004` (`generated_reports` table) |
| 11 | Lab escalation | ✅ | `automation.js` emits `lab_required` flag; operator endpoint [functions/api/ops/cases/\[caseId\]/escalate.js](../functions/api/ops/cases/[caseId]/escalate.js) flips status to `Escalation laboratoire`, records audit + notification outbox row | Optional: build a Resend template once `LAB_ESCALATION_INBOX` is published |
| 12 | Monitoring upsell | 🟠 | [functions/_lib/monitor.js](../functions/_lib/monitor.js), [functions/api/monitoring/health.js](../functions/api/monitoring/health.js), [functions/api/monitoring/accounts.js](../functions/api/monitoring/accounts.js), [functions/api/monitoring/accounts/\[accountId\]/dashboard.js](../functions/api/monitoring/accounts/[accountId]/dashboard.js), [functions/api/monitoring/agents/register.js](../functions/api/monitoring/agents/register.js), [functions/api/monitoring/alerts/\[alertId\]/convert-to-case.js](../functions/api/monitoring/alerts/[alertId]/convert-to-case.js) | Pending migration `0004`; Stripe subscription product not yet wired; agent binary not in repo |
| 13 | Admin dashboard | 🟠 | [functions/_lib/admin-dashboard.js](../functions/_lib/admin-dashboard.js), [functions/api/admin/dashboard.js](../functions/api/admin/dashboard.js), [functions/api/admin/opportunities.js](../functions/api/admin/opportunities.js), [functions/api/admin/opportunities/\[opportunityId\].js](../functions/api/admin/opportunities/[opportunityId].js); UI: [operations/index.html](../operations/index.html) behind Cloudflare Access | Pending migration `0004`; React `NexuraAdminConsole.jsx` reference is not consumed |

## Blockers

- 🚫 **Migration `0004_remotelab_platform.sql`** is committed but NOT applied to
  Neon (local `.dev.vars` `DATABASE_URL` returns `password authentication failed`).
  Stages 8 / 10 / 12 / 13 endpoints are wired and tested; they gracefully
  return `503` until the schema is in place. Apply via Neon web console or
  refresh the local credential and run
  `psql "$DATABASE_URL" -f migrations/neon/0004_remotelab_platform.sql`.

## Recommended next moves (scoped, in order)

1. Apply migration `0004` to Neon — flips 8 / 10 / 12 / 13 from 🟠 to ✅ with
   no further code changes (endpoints already shipped and unit-tested).
2. Stage 12: register a Stripe subscription product for Monitor plans and wire
   `/api/monitoring/accounts` signup → Stripe checkout → recurring webhook in
   `stripe-webhook.js`. Publish the agent binaries (signed) under `/downloads/`
   only when (a) Authenticode/notarization done, (b) checksums published.
3. Optional: build the React `apps/remotelab-portal/` workspace and serve it
   at `/remotelab/*`; until then the vanilla [remotefix.html](../remotefix.html)
   and [nexura-recovery-desk-montreal.html](../nexura-recovery-desk-montreal.html)
   remain canonical.

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


