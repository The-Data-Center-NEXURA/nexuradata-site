# NEXURA DATA Platform — One-Block Architecture (canonical)

> Canonical reference. Do not paraphrase elsewhere — link here.

Your website is not Windows-based, and it should not be.

Your website stays platform-neutral:
- `nexuradata.ca` runs the client portal in the browser.
- The backend runs on Node.js / npm.
- The database is Neon Postgres.
- Any Windows / macOS / Linux diagnostic agent is optional and only runs on
  the customer's device when deeper local diagnostics are required.

## Core structure

| Surface | Purpose |
|---------|---------|
| `nexuradata.ca/remotelab` | Customer-facing RemoteLab portal. Works in any browser. No Windows dependency. |
| `api.nexuradata.ca` | Node.js + npm backend (Express or Next.js API). Connects to Neon Postgres. Handles cases, triage, sessions, consent, diagnostics, reports, quotes, payments, alerts and opportunities. |
| Neon Postgres | Stores clients, cases, triage results, sessions, consents, diagnostics, monitoring alerts, opportunities, quotes, reports and audit logs. |
| Optional RemoteLab Device Agent | Only installed on the customer's device when local diagnostics are needed. Available later as Windows / macOS / Linux. Not part of the website. Not required for browser-only or cloud-based diagnostics. |

> Implementation note: today the backend runs as Cloudflare Pages Functions
> against Neon. The `api.nexuradata.ca` split is a future surface; do not stand
> up a second origin without need. See [PIPELINE-STATUS.md](./PIPELINE-STATUS.md)
> "v2 surface-area target" for the gap analysis.

## Diagnostic modes

### 1. Browser diagnostic
- No installation.
- Runs directly from `nexuradata.ca`.
- Handles: intake form, risk assessment, case creation, quote generation,
  report generation, lab escalation, payment, monitoring upsell.

### 2. Cloud diagnostic
- No device agent required.
- Uses OAuth or guided connection.
- Handles: OneDrive, Google Drive, Dropbox, iCloud, Microsoft 365, cloud
  trash, previous versions, sync issues, conflicts.

### 3. Device agent diagnostic
- Optional. Only when deeper local checks are required.
- Runs on the customer's own computer.
- Handles: local disks, SMART health, volumes, Outlook profile, OneDrive
  local client, system logs, safe non-destructive commands.

### 4. Lab required
- No remote repair.
- Used for: clicking drive, SSD not detected, physical damage, liquid
  damage, broken USB, degraded RAID, ransomware, legal / forensic case,
  high-risk recovery.

## Product flow

```
Client visits nexuradata.ca
        ↓
Clicks "Start Secure RemoteLab Diagnostic"
        ↓
Browser portal opens
        ↓
Client describes the problem
        ↓
Node backend creates a case in Neon
        ↓
Rules engine classifies the issue
        ↓
Risk score is generated
        ↓
System decides one of these paths:

  A. Browser-only diagnostic
     → no download
     → report generated
     → quote / payment / lab / monitoring option

  B. Cloud diagnostic
     → connect cloud account
     → check trash, versions, sync, conflicts
     → offer CloudRescue

  C. Device agent required
     → ask customer to choose: Windows / macOS / Linux
     → temporary diagnostic agent runs
     → sends report to API
     → backend decides whether safe repair is allowed

  D. Lab required
     → block remote repair
     → send lab intake instructions
     → create high-value recovery opportunity
```

## Brand language

Do not say:

> "Download our Windows app."

Say:

> "Start secure RemoteLab diagnostic."

Only when needed, say:

> "This case requires a temporary diagnostic agent for your device. Choose
> your operating system: Windows, macOS or Linux."

## Core products

| Product | Role |
|---------|------|
| NEXURA RemoteLab | Active problems and emergencies. |
| NEXURA Monitor | Prevents future problems with recurring monitoring. |
| NEXURA Recovery Lab | Serious physical / logical recovery. |
| NEXURA Forensic Desk | Legal, ransomware, evidence and insurance cases. |

## Tech stack

**Frontend**
- React component or embeddable portal on `nexuradata.ca`.
- Can work with WordPress, Webflow, custom React, Next.js or any website.

**Backend**
- Node.js
- npm
- Express or Next.js API
- Neon Postgres
- Resend for email
- Stripe for payment
- Optional PDF generator for reports

**Database** — Neon Postgres.

**Tables**
- `clients`
- `cases`
- `triage_results`
- `remote_sessions`
- `consents`
- `diagnostic_reports`
- `agent_commands`
- `audit_logs`
- `monitoring_accounts`
- `monitoring_agents`
- `monitored_assets`
- `health_checks`
- `health_alerts`
- `service_opportunities`
- `generated_reports`
- `quotes`
- `payments`

> The Monitor / opportunity / report tables are defined in
> [migrations/neon/0004_remotelab_platform.sql](../migrations/neon/0004_remotelab_platform.sql)
> and remain unapplied until Neon credentials are refreshed. See
> [PIPELINE-STATUS.md](./PIPELINE-STATUS.md) blockers.

## Business loop

```
Client has a problem
       ↓
RemoteLab diagnoses it
       ↓
If safe: fix remotely
       ↓
If risky: escalate to lab
       ↓
If business client: offer Monitor
       ↓
Monitor detects future risk
       ↓
Alert becomes opportunity
       ↓
Opportunity becomes quote
       ↓
Quote becomes revenue
       ↓
Client stays protected monthly
```

## Final architecture

| Layer | Address |
|-------|---------|
| Website | `nexuradata.ca/remotelab` |
| Backend | `api.nexuradata.ca` |
| Database | Neon Postgres |
| Optional agent — Windows | `nexuradata.ca/downloads/remotelab-agent-windows.exe` |
| Optional agent — macOS | `nexuradata.ca/downloads/remotelab-agent-macos.dmg` |
| Optional agent — Linux | `nexuradata.ca/downloads/remotelab-agent-linux.AppImage` |

> Agents must be code-signed (Authenticode for Windows, Apple notarization for
> macOS, gpg-signed AppImage for Linux) with checksums + signatures published
> next to the binary before the `/downloads/` URLs go live. Until then, link
> a "coming soon" stub — never ship an unsigned binary.

## Main promise

> NEXURA RemoteLab detects whether a data problem is safe to handle
> remotely, blocks dangerous actions, runs a secure diagnostic, fixes only
> what is safe, and escalates serious cases to the NEXURA DATA laboratory.
