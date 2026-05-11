# NEXURA RemoteLab — Product Brief (canonical)

> **Source of truth.** This file is the architectural brief submitted by the founder
> on 2026-05-07. All RemoteLab / Monitor / Recovery Lab / Forensic Desk work must
> trace back to this document. Do not silently deviate. If a constraint here
> blocks implementation, raise it in a PR description, do not invent a
> workaround.

## One-line promise

NEXURA RemoteLab detects whether a data problem is safe to handle remotely,
blocks dangerous actions, runs a secure diagnostic, fixes only what is safe,
and escalates serious cases to the NEXURA DATA laboratory.

## Platform stance

- The website is **not Windows-based**, and must never be marketed as such.
- `nexuradata.ca` runs the client portal in the browser.
- Backend: Node.js + npm (Express or Next.js API).
- Database: Neon Postgres.
- A Windows / macOS / Linux diagnostic agent is **optional** and only runs on
  the customer's device when deeper local diagnostics are required.

## Core structure

| Surface | Role |
|---|---|
| `nexuradata.ca/remotelab` | Customer-facing RemoteLab portal. Browser-only. No Windows dependency. |
| `api.nexuradata.ca` | Node.js + npm backend. Cases, triage, sessions, consent, diagnostics, reports, quotes, payments, alerts, opportunities. |
| Neon Postgres | Clients, cases, triage, sessions, consents, diagnostics, alerts, opportunities, quotes, reports, audit logs. |
| Optional device agent | Windows `.exe` / macOS `.dmg` / Linux `.AppImage`. Only when local checks are required. |

Optional download URLs (reserved):

```
nexuradata.ca/downloads/remotelab-agent-windows.exe
nexuradata.ca/downloads/remotelab-agent-macos.dmg
nexuradata.ca/downloads/remotelab-agent-linux.AppImage
```

## Four diagnostic modes

1. **Browser Diagnostic** — no installation. Intake, risk score, case creation,
   quote, report, lab escalation, payment, monitoring upsell.
2. **Cloud Diagnostic** — no agent. OAuth or guided connection to OneDrive,
   Google Drive, Dropbox, iCloud, Microsoft 365. Checks trash, previous
   versions, sync issues, conflicts.
3. **Device Agent Diagnostic** — optional, only when deeper local checks are
   required. Runs on customer's machine. Local disks, SMART, volumes, Outlook
   profile, OneDrive client, system logs, safe non-destructive commands only.
4. **Lab Required** — no remote repair. Clicking drive, undetected SSD,
   physical / liquid damage, broken USB, degraded RAID, ransomware, legal /
   forensic case, high-risk recovery.

## Product flow

```
Client visits nexuradata.ca
  └─ Clicks "Start Secure RemoteLab Diagnostic"
     └─ Browser portal opens
        └─ Client describes the problem
           └─ Node backend creates a case in Neon
              └─ Rules engine classifies + risk score
                 └─ System routes to one of:
                    A. Browser-only diagnostic → report → quote / payment / lab / monitoring
                    B. Cloud diagnostic → connect cloud → check trash, versions, sync → CloudRescue
                    C. Device agent → choose OS → temporary agent → report → backend decides
                    D. Lab required → block remote repair → lab intake → high-value opportunity
```

## Brand language

**Never say:** "Download our Windows app."

**Default:** "Start secure RemoteLab diagnostic."

**Only when needed:** "This case requires a temporary diagnostic agent for
your device. Choose your operating system: Windows, macOS or Linux."

## Core products

- **NEXURA RemoteLab** — active problems and emergencies.
- **NEXURA Monitor** — recurring monitoring; prevents future problems.
- **NEXURA Recovery Lab** — serious physical / logical recovery.
- **NEXURA Forensic Desk** — legal, ransomware, evidence, insurance.

## Tech stack

- **Frontend:** React component or embeddable portal on `nexuradata.ca`. Must
  work with WordPress, Webflow, custom React, Next.js, or any host.
- **Backend:** Node.js, npm, Express or Next.js API, Neon Postgres, Resend
  (email), Stripe (payment), optional PDF generator.
- **Database:** Neon Postgres.

### Tables

`clients`, `cases`, `triage_results`, `remote_sessions`, `consents`,
`diagnostic_reports`, `agent_commands`, `audit_logs`, `monitoring_accounts`,
`monitoring_agents`, `monitored_assets`, `health_checks`, `health_alerts`,
`service_opportunities`, `generated_reports`, `quotes`, `payments`.

## Business loop

```
Problem → RemoteLab diagnoses
       → Safe? fix remotely
       → Risky? escalate to lab
       → Business? offer Monitor
       → Monitor detects future risk
       → Alert → Opportunity → Quote → Revenue
       → Client stays protected monthly
```

## Implementation guardrails

1. **The agent never decides.** The server decides, signs, expires, and
   journals every action.
2. **Default to browser-only.** Only ask for the device agent when the rules
   engine demands it.
3. **Lab Required is a hard block** on remote repair, not a soft suggestion.
4. **Bilingual parity** (FR primary, EN mirror under `/en/`).
5. **No credentials in code.** Stripe / Resend / Neon / Access Code secrets
   live in Cloudflare Pages config.

---

## Platform v2 (2026-05-07 expansion)

This section captures the founder's expanded product vision delivered on
2026-05-07. The original brief above remains the live MVP reference; this
section is **additive** and frames the multi-product platform we are porting
into Cloudflare Pages Functions + Neon (Path 1 — single runtime).

### 1. Five-product family

```
NEXURA DATA Platform
├── NEXURA RemoteLab        — secure remote diagnostic and data-loss triage
├── NEXURA Monitor          — preventive monitoring (disks, backups, servers, cloud sync)
├── NEXURA Recovery Lab     — advanced physical and logical recovery
├── NEXURA Forensic Desk    — legal, evidence, ransomware, incident reports
└── NEXURA Business Protection — bundled enterprise package
```

The platform is positioned as a **data protection company**, not a
data-recovery shop.

### 2. Three client journeys

**Scenario A — Individual client, external drive inaccessible.**
RemoteLab triage → medium risk → diagnostic link → consent → SMART/volume
checks → safe mount repair → 149 $ paid → signed command executed → report →
case closed → backup/monitoring offer. Revenue: 149 $ immediate, optional
49 $ backup setup, optional future lab recovery.

**Scenario B — Business NAS, RAID degraded.**
RemoteLab triage → high risk → no auto repair → Server Triage 799 $ → agent
collects logs/SMART/RAID → report identifies failing drive + stale backup →
intervention 2 500 $ – 8 000 $ → Monitor Server 499 $/month recurring.

**Scenario C — Ransomware.**
RemoteLab detects encryption → no repair, no cleanup → First Response
1 500 $ → indicators + backup state collected → insurance/management report
→ recovery + forensic + monitoring package. Revenue: 499 $ – 2 500 $ first
response, 2 500 $ – 15 000 $ recovery, recurring monitoring afterward.

### 3. Five technical layers

1. **Website / intake** — marketing site + intake forms (existing repo root).
2. **Node API** — production runtime is Cloudflare Pages Functions (ESM
   `.js`) ported from [`apps/remotelab-api/src/server.ts`](../apps/remotelab-api/src/server.ts).
3. **Neon Postgres** — `migrations/neon/0004_remotelab_platform.sql` extends
   the existing schema additively.
4. **RemoteLab / Monitor agent** — browser + cloud OAuth in v1; desktop
   installers (Win/macOS/Linux) deferred.
5. **Admin console** — `/operations/remotelab/*`, Cloudflare Access protected.

### 4. Four engines

- **Intake engine** — turns messy client language into structured fields
  (deviceType, symptom, OS, urgency, business/individual, criticalData,
  legalMatter, attemptedFix, hasBackup).
- **Triage engine** — classifies into `REMOTE_FIX`, `REMOTE_DIAGNOSE_ONLY`,
  `LAB_REQUIRED`, `SERVER_TRIAGE`, `RANSOMWARE_RESPONSE`,
  `HUMAN_REVIEW_REQUIRED`, `MONITORING_OPPORTUNITY`. Strongest rule: when
  risk is unclear, diagnose only; when risk is high, block repair; when
  repair is safe, require consent + payment + signed command.
- **Risk engine** — 0–29 Low, 30–49 Medium, 50–69 Medium-high, 70–84 High,
  85–100 Critical. Always show the contributing reasons, not only the score.
- **Command engine** — agent never decides; server signs (HMAC-SHA256 with
  `COMMAND_SIGNING_SECRET`). Allowed MVP: `read_diagnostics`, `read_smart`,
  `read_event_logs`, `read_cloud_metadata`, `read_outlook_profile`,
  `assign_drive_letter`, `mount_volume`, `restart_sync_service`,
  `reindex_outlook`. Blocked MVP: `format`, `chkdsk_write`, `partition_write`,
  `raid_rebuild`, `delete_files`, `restore_to_same_disk`, `firmware_reset`,
  `overwrite_cloud_versions`.

### 5. NEXURA Monitor — recurring revenue layer

Watchlist by asset class:

- **Workstations** — disk SMART, free space, critical events, backup status,
  cloud sync status, ransomware indicators.
- **NAS / servers** — RAID status, disk health, backup freshness, snapshot
  status, capacity, failed login spikes, service failures.
- **Cloud** — OneDrive sync stuck, Drive conflicts, Dropbox sync failure,
  deleted-file spikes, version-history availability, monitoring alerts.

Every alert generates: severity, explanation, recommended service,
estimated price, **convert-to-case** button. Monitoring becomes a sales
pipeline, not a passive dashboard.

### 6. Admin console — money dashboard

Cards: new RemoteLab cases, active sessions, diagnostics waiting, safe
repairs available, lab escalations, open monitoring alerts, critical
business alerts, estimated service opportunity, monthly recurring revenue.

Per-case view: client, device, symptom, risk score, recommended service,
price range, session status, consent status, diagnostic report, safe
actions, blocked actions, payment status, audit log, **next best action**.

Next-best-action examples: call immediately, send RemoteLab link, request
payment, escalate to lab, offer Monitor Server, send ransomware report,
close as resolved.

### 7. Pricing tiers

| Service | Price (CAD) |
|---|---|
| RemoteLab Diagnose | 49 $ |
| RemoteLab Fix | 99 $ – 499 $ |
| RemoteLab SafeScan | 79 $ – 299 $ |
| RemoteLab CloudRescue | 149 $ – 399 $ |
| RemoteLab OutlookRescue | 199 $ – 499 $ |
| RemoteLab Server Triage | 399 $ – 1 200 $ |
| RemoteLab Ransomware First Response | 499 $ – 2 500 $ |
| Recovery Lab | 649 $ – 8 000 $+ |
| Monitor Basic | 49 $/month |
| Monitor Business | 199 $/month |
| Monitor Server | 499 $/month |
| Enterprise Protection | Custom |

Business clients should never see only a cheap one-time fix — they should
see a protection path: fix today → prevent tomorrow → protect monthly.

### 8. Six-phase roadmap

1. **Foundation** — clean structure, migrations, env config, error handling,
   API auth, rate limiting, logging. (In progress in this repo.)
2. **Client portal** — `/start`, `/assessment`, `/session`, `/consent`,
   `/report`, `/payment`. Server-rendered HTML in v1 (React deferred).
3. **Admin console** — `/admin/cases`, `/admin/alerts`,
   `/admin/opportunities`, `/admin/monitoring`, `/admin/cases/:id` under
   Cloudflare Access.
4. **Agent MVP** — Windows diagnostic collector, JSON report POST. No repair
   commands yet. v1 ships browser + cloud OAuth before any installer.
5. **Safe repair commands** — `assign_drive_letter`, `mount_volume`,
   `restart_sync_service`, `reindex_outlook`.
6. **Monitoring** — heartbeat, health snapshots, alerts, monthly report,
   business dashboard, subscription billing.

### 9. Opportunity Engine — the flywheel

Every case or alert creates a `service_opportunities` row:

```
{
  "source": "monitoring_alert",
  "recommendedService": "RemoteLab Server Triage",
  "estimatedValue": 799,
  "probability": 0.72,
  "nextAction": "Call business client immediately"
}
```

Mapping:

- Low disk space → System Health Repair 149 $
- Cloud sync stuck → CloudRescue 299 $
- Backup failed → Backup Readiness Check 399 $
- RAID degraded → Server Triage 799 $
- SMART failed → Lab Recovery 1 500 $+
- Ransomware indicators → First Response 1 500 $+
- Business had one incident → Monitor Business 199 $/month

Loop: more cases → more diagnostics → more device intelligence → better
triage → more trust → more repairs/lab escalations → more monitoring
subscriptions → more alerts → more cases.

### 10. Brand-language guardrails

- Default CTA: **"Start secure RemoteLab diagnostic."** Never "Download our
  Windows app."
- Only when triage decides a device agent is required: "This case requires
  a temporary diagnostic agent for your device. Choose your operating
  system: Windows, macOS or Linux."
- Reports justify premium pricing — they are a trust artifact, not just a
  technical artifact. Three templates: RemoteLab Diagnose, Server Triage,
  Ransomware First Response.

### Reference artifacts

- TS source-of-truth API: [`apps/remotelab-api/src/server.ts`](../apps/remotelab-api/src/server.ts).
- React portal v2 UI track: [`apps/remotelab-portal/src/NexuraClientPortal.jsx`](../apps/remotelab-portal/src/NexuraClientPortal.jsx).
- Production port lives in `functions/api/remotelab/**` (Phase C+ of the
  migration plan). Brand rename `RemoteFix → RemoteLab` lands in Phase E.
