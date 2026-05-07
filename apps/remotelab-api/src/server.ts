/*
NEXURA RemoteLab - Node/npm + Neon Postgres API MVP
============================================================

This is a production-oriented starter backend for NEXURA RemoteLab.
It uses:
- Node.js
- Express
- Neon Postgres through pg
- Zod validation
- Token hashing
- Consent records
- Audit logs
- Risk triage
- Diagnostic reports
- Server-authorized agent commands

Install:
  npm init -y
  npm install express cors helmet dotenv zod pg nanoid
  npm install -D typescript ts-node-dev @types/node @types/express @types/cors @types/pg

package.json:
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}

.env:
  DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
  PORT=8787
  BASE_URL="https://nexuradata.ca/remotelab"

Run:
  npm run dev

Important safety principle:
The desktop agent never decides what to repair.
The backend triages, validates, authorizes and signs commands.
The agent only executes approved, non-destructive commands.
*/

import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import crypto from "crypto";
import { Pool } from "pg";
import { nanoid } from "nanoid";
import { z } from "zod";

// ============================================================
// Config
// ============================================================

const CONFIG = {
  port: Number(process.env.PORT || 8787),
  baseUrl: process.env.BASE_URL || "http://localhost:8787/remotelab",
  databaseUrl: process.env.DATABASE_URL,
  brand: "NEXURA DATA",
  product: "NEXURA RemoteLab",
  currency: "CAD",
  tokenTtlMinutes: 45,
  commandTtlMinutes: 10,
  maxAutoRepairRisk: 35,
  termsVersion: "remotelab-terms-2026-05-07",
};

if (!CONFIG.databaseUrl) {
  throw new Error("Missing DATABASE_URL. Add your Neon connection string to .env.");
}

const pool = new Pool({
  connectionString: CONFIG.databaseUrl,
  ssl: { rejectUnauthorized: false },
});

// ============================================================
// Types
// ============================================================

type ClientType = "individual" | "business" | "lawyer" | "insurance";
type Urgency = "standard" | "priority" | "emergency";

type DeviceType =
  | "external_drive"
  | "ssd_nvme"
  | "windows_pc"
  | "mac"
  | "cloud"
  | "outlook"
  | "nas_server"
  | "ransomware";

type Symptom =
  | "drive_detected_inaccessible"
  | "format_prompt"
  | "deleted_files"
  | "cloud_sync_stuck"
  | "outlook_missing_mail"
  | "system_slow_errors"
  | "nas_raid_warning"
  | "clicking_drive"
  | "ssd_not_detected"
  | "encrypted_files"
  | "unknown";

type CaseStatus =
  | "case_created"
  | "triage_completed"
  | "session_created"
  | "email_ready"
  | "waiting_for_consent"
  | "consent_given"
  | "diagnostic_received"
  | "remote_repair_allowed"
  | "payment_required"
  | "lab_required"
  | "closed";

type RemoteAction =
  | "read_diagnostics"
  | "read_smart"
  | "read_event_logs"
  | "read_cloud_metadata"
  | "read_outlook_profile"
  | "mount_volume"
  | "assign_drive_letter"
  | "restart_sync_service"
  | "reindex_outlook"
  | "recover_to_external_destination"
  | "format"
  | "chkdsk_write"
  | "partition_write"
  | "raid_rebuild"
  | "delete_files"
  | "overwrite_cloud_versions"
  | "restore_to_same_disk"
  | "firmware_reset";

// ============================================================
// Validation
// ============================================================

const clientSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  type: z.enum(["individual", "business", "lawyer", "insurance"]),
});

const intakeSchema = z.object({
  deviceType: z.enum([
    "external_drive",
    "ssd_nvme",
    "windows_pc",
    "mac",
    "cloud",
    "outlook",
    "nas_server",
    "ransomware",
  ]),
  symptom: z.enum([
    "drive_detected_inaccessible",
    "format_prompt",
    "deleted_files",
    "cloud_sync_stuck",
    "outlook_missing_mail",
    "system_slow_errors",
    "nas_raid_warning",
    "clicking_drive",
    "ssd_not_detected",
    "encrypted_files",
    "unknown",
  ]),
  urgency: z.enum(["standard", "priority", "emergency"]),
  containsCriticalData: z.boolean(),
  attemptedFix: z.boolean(),
  legalMatter: z.boolean(),
  notes: z.string().max(4000).optional(),
});

const createCaseSchema = z.object({
  client: clientSchema,
  intake: intakeSchema,
});

const createSessionSchema = z.object({
  caseId: z.string().min(4),
});

const consentSchema = z.object({
  caseId: z.string().min(4),
  sessionId: z.string().min(4),
  token: z.string().min(32),
});

const diagnosticSchema = z.object({
  caseId: z.string().min(4),
  sessionId: z.string().min(4),
  token: z.string().min(32),
  agentVersion: z.string().min(3).max(30),
  platform: z.enum(["windows", "macos", "linux"]),
  diagnostics: z.object({
    disks: z
      .array(
        z.object({
          model: z.string().optional(),
          serial: z.string().optional(),
          sizeGb: z.number().optional(),
          smartStatus: z.enum(["passed", "warning", "failed", "unknown"]).optional(),
          isDetected: z.boolean(),
          hasMountPoint: z.boolean().optional(),
          fileSystem: z.string().optional(),
          isReadOnly: z.boolean().optional(),
        })
      )
      .optional(),
    cloud: z
      .object({
        provider: z.enum(["onedrive", "google_drive", "dropbox", "icloud"]).optional(),
        syncStatus: z.enum(["healthy", "stuck", "conflict", "unknown"]).optional(),
        deletedItemsFound: z.number().optional(),
        previousVersionsFound: z.number().optional(),
      })
      .optional(),
    outlook: z
      .object({
        profileDetected: z.boolean().optional(),
        pstFilesFound: z.number().optional(),
        ostFilesFound: z.number().optional(),
        indexingHealthy: z.boolean().optional(),
      })
      .optional(),
    system: z
      .object({
        freeSpaceGb: z.number().optional(),
        criticalEventsLast24h: z.number().optional(),
        malwareIndicators: z.number().optional(),
        ransomwareExtensionsDetected: z.array(z.string()).optional(),
      })
      .optional(),
  }),
});

const createCommandSchema = z.object({
  caseId: z.string().min(4),
  sessionId: z.string().min(4),
  action: z.enum([
    "read_diagnostics",
    "read_smart",
    "read_event_logs",
    "read_cloud_metadata",
    "read_outlook_profile",
    "mount_volume",
    "assign_drive_letter",
    "restart_sync_service",
    "reindex_outlook",
    "recover_to_external_destination",
    "format",
    "chkdsk_write",
    "partition_write",
    "raid_rebuild",
    "delete_files",
    "overwrite_cloud_versions",
    "restore_to_same_disk",
    "firmware_reset",
  ]),
  paymentApproved: z.boolean().default(false),
});

// ============================================================
// SQL migrations for Neon
// ============================================================

const SCHEMA_SQL = `
create table if not exists clients (
  id text primary key,
  name text not null,
  email text not null,
  phone text,
  type text not null check (type in ('individual','business','lawyer','insurance')),
  created_at timestamptz not null default now()
);

create table if not exists cases (
  id text primary key,
  client_id text not null references clients(id),
  status text not null,
  device_type text not null,
  symptom text not null,
  urgency text not null,
  contains_critical_data boolean not null default false,
  attempted_fix boolean not null default false,
  legal_matter boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists triage_results (
  id text primary key,
  case_id text not null references cases(id),
  matched_rule text not null,
  product text not null,
  service text not null,
  mode text not null,
  remote_eligible boolean not null,
  auto_repair_allowed boolean not null,
  requires_lab boolean not null,
  risk_score int not null check (risk_score >= 0 and risk_score <= 100),
  risk_label text not null,
  price_min int not null,
  price_max int not null,
  reason text not null,
  next_action text not null,
  do_not_do jsonb not null default '[]'::jsonb,
  allowed_actions jsonb not null default '[]'::jsonb,
  blocked_actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists remote_sessions (
  id text primary key,
  case_id text not null references cases(id),
  token_hash text not null,
  public_url text not null,
  status text not null,
  allowed_actions jsonb not null default '[]'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists consents (
  id text primary key,
  case_id text not null references cases(id),
  session_id text not null references remote_sessions(id),
  client_email text not null,
  ip_address text,
  user_agent text,
  accepted_terms_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists diagnostic_reports (
  id text primary key,
  case_id text not null references cases(id),
  severity text not null,
  title text not null,
  summary text not null,
  recommended_status text not null,
  safe_actions_to_offer jsonb not null default '[]'::jsonb,
  blocked_actions jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists agent_commands (
  id text primary key,
  case_id text not null references cases(id),
  session_id text not null references remote_sessions(id),
  action text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  server_signature text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id text primary key,
  case_id text not null references cases(id),
  actor text not null,
  event text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_cases_client_id on cases(client_id);
create index if not exists idx_cases_status on cases(status);
create index if not exists idx_triage_case_id on triage_results(case_id);
create index if not exists idx_sessions_case_id on remote_sessions(case_id);
create index if not exists idx_reports_case_id on diagnostic_reports(case_id);
create index if not exists idx_commands_case_id on agent_commands(case_id);
create index if not exists idx_audit_case_id on audit_logs(case_id);

-- ============================================================
-- NEXURA Monitor: recurring prevention layer
-- ============================================================

create table if not exists monitoring_plans (
  id text primary key,
  name text not null,
  monthly_price_cad int not null,
  max_assets int not null,
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists monitoring_accounts (
  id text primary key,
  client_id text not null references clients(id),
  plan_id text references monitoring_plans(id),
  status text not null check (status in ('trial','active','past_due','cancelled','paused')),
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists monitoring_agents (
  id text primary key,
  monitoring_account_id text not null references monitoring_accounts(id),
  agent_key_hash text not null,
  hostname text not null,
  platform text not null check (platform in ('windows','macos','linux','nas','server')),
  agent_version text not null,
  status text not null check (status in ('pending','active','stale','revoked')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists monitored_assets (
  id text primary key,
  monitoring_account_id text not null references monitoring_accounts(id),
  agent_id text references monitoring_agents(id),
  asset_type text not null check (asset_type in ('workstation','server','nas','external_drive','cloud_account','mailbox')),
  display_name text not null,
  serial text,
  model text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null check (status in ('healthy','warning','critical','offline','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists health_checks (
  id text primary key,
  monitoring_account_id text not null references monitoring_accounts(id),
  asset_id text references monitored_assets(id),
  agent_id text references monitoring_agents(id),
  check_type text not null,
  severity text not null check (severity in ('info','low','medium','high','critical')),
  summary text not null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists health_alerts (
  id text primary key,
  monitoring_account_id text not null references monitoring_accounts(id),
  asset_id text references monitored_assets(id),
  source_check_id text references health_checks(id),
  severity text not null check (severity in ('low','medium','high','critical')),
  title text not null,
  description text not null,
  recommended_service text not null,
  recommended_price_min int not null,
  recommended_price_max int not null,
  status text not null check (status in ('open','acknowledged','converted_to_case','resolved','dismissed')),
  created_case_id text references cases(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_monitoring_accounts_client_id on monitoring_accounts(client_id);
create index if not exists idx_monitoring_agents_account_id on monitoring_agents(monitoring_account_id);
create index if not exists idx_monitored_assets_account_id on monitored_assets(monitoring_account_id);
create index if not exists idx_health_checks_account_id on health_checks(monitoring_account_id);
create index if not exists idx_health_alerts_account_id on health_alerts(monitoring_account_id);
create index if not exists idx_health_alerts_status on health_alerts(status);

-- ============================================================
-- Opportunity Engine: converts diagnostics/alerts into revenue
-- ============================================================

create table if not exists service_opportunities (
  id text primary key,
  source_type text not null check (source_type in ('triage','diagnostic_report','monitoring_alert','manual')),
  source_id text,
  case_id text references cases(id),
  monitoring_account_id text references monitoring_accounts(id),
  client_id text references clients(id),
  title text not null,
  recommended_service text not null,
  description text not null,
  estimated_value_min int not null,
  estimated_value_max int not null,
  probability numeric(5,2) not null default 0.50,
  priority text not null check (priority in ('low','medium','high','critical')),
  next_best_action text not null,
  status text not null check (status in ('open','contacted','quoted','won','lost','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists generated_reports (
  id text primary key,
  case_id text references cases(id),
  monitoring_account_id text references monitoring_accounts(id),
  report_type text not null check (report_type in ('remotelab_diagnostic','server_triage','ransomware_response','monitoring_summary','business_review')),
  title text not null,
  body_markdown text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists quotes (
  id text primary key,
  case_id text references cases(id),
  opportunity_id text references service_opportunities(id),
  client_id text references clients(id),
  title text not null,
  amount_cad int not null,
  status text not null check (status in ('draft','sent','approved','declined','expired','paid')),
  line_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_opportunities_case_id on service_opportunities(case_id);
create index if not exists idx_service_opportunities_client_id on service_opportunities(client_id);
create index if not exists idx_service_opportunities_status on service_opportunities(status);
create index if not exists idx_generated_reports_case_id on generated_reports(case_id);
create index if not exists idx_quotes_case_id on quotes(case_id);
`;

// ============================================================
// Utility
// ============================================================

function makeId(prefix: string) {
  return `${prefix}_${nanoid(14)}`;
}

function rawToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function riskLabel(score: number) {
  if (score >= 85) return "Critical";
  if (score >= 70) return "High";
  if (score >= 50) return "Medium-high";
  if (score >= 30) return "Medium";
  return "Low";
}

function clampRisk(score: number) {
  return Math.max(0, Math.min(100, score));
}

function urgencyMultiplier(urgency: Urgency) {
  if (urgency === "emergency") return 1.6;
  if (urgency === "priority") return 1.25;
  return 1;
}

async function audit(caseId: string, actor: "system" | "client" | "agent" | "operator", event: string, metadata: Record<string, unknown> = {}) {
  await pool.query(
    `insert into audit_logs (id, case_id, actor, event, metadata) values ($1,$2,$3,$4,$5)`,
    [makeId("log"), caseId, actor, event, metadata]
  );
}

function safeJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

// ============================================================
// Rules engine
// ============================================================

type RuleContext = z.infer<typeof intakeSchema> & { clientType: ClientType };

type RuleOutput = {
  matchedRule: string;
  service: string;
  mode: "remote_diagnose" | "remote_fix" | "server_triage" | "ransomware_response" | "lab_recovery";
  remoteEligible: boolean;
  autoRepairBase: boolean;
  requiresLab: boolean;
  riskBase: number;
  priceBaseMin: number;
  priceBaseMax: number;
  reason: string;
  nextAction: string;
  doNotDo: string[];
  allowedActions: RemoteAction[];
  blockedActions: RemoteAction[];
};

type Rule = {
  id: string;
  when: (ctx: RuleContext) => boolean;
  output: RuleOutput;
};

const RULES: Rule[] = [
  {
    id: "physical-clicking-drive-lab-only",
    when: (ctx) => ctx.symptom === "clicking_drive",
    output: {
      matchedRule: "physical-clicking-drive-lab-only",
      service: "NEXURA Laboratory Recovery",
      mode: "lab_recovery",
      remoteEligible: false,
      autoRepairBase: false,
      requiresLab: true,
      riskBase: 95,
      priceBaseMin: 649,
      priceBaseMax: 5000,
      reason: "A clicking drive may indicate mechanical damage. Remote actions could make recovery worse.",
      nextAction: "Stop using the drive and escalate to the NEXURA lab.",
      doNotDo: ["Do not power cycle repeatedly", "Do not run CHKDSK", "Do not freeze the drive", "Do not open the drive"],
      allowedActions: [],
      blockedActions: ["read_smart", "mount_volume", "assign_drive_letter", "format", "chkdsk_write", "partition_write"],
    },
  },
  {
    id: "ssd-not-detected-lab-only",
    when: (ctx) => ctx.symptom === "ssd_not_detected",
    output: {
      matchedRule: "ssd-not-detected-lab-only",
      service: "NEXURA SSD Advanced Lab Diagnostic",
      mode: "lab_recovery",
      remoteEligible: false,
      autoRepairBase: false,
      requiresLab: true,
      riskBase: 88,
      priceBaseMin: 900,
      priceBaseMax: 2800,
      reason: "An SSD that is not detected can indicate controller, firmware or electronic failure.",
      nextAction: "Stop connecting the SSD and escalate to lab diagnostic.",
      doNotDo: ["Do not initialize the SSD", "Do not update firmware", "Do not format", "Do not use recovery software"],
      allowedActions: [],
      blockedActions: ["firmware_reset", "format", "partition_write", "chkdsk_write"],
    },
  },
  {
    id: "ransomware-first-response",
    when: (ctx) => ctx.deviceType === "ransomware" || ctx.symptom === "encrypted_files",
    output: {
      matchedRule: "ransomware-first-response",
      service: "RemoteLab Ransomware First Response",
      mode: "ransomware_response",
      remoteEligible: true,
      autoRepairBase: false,
      requiresLab: false,
      riskBase: 92,
      priceBaseMin: 499,
      priceBaseMax: 2500,
      reason: "Ransomware requires containment, evidence preservation, backup verification and recovery planning.",
      nextAction: "Run read-only incident triage and prepare an action plan.",
      doNotDo: ["Do not delete ransom notes", "Do not wipe machines", "Do not pay before assessment", "Do not reconnect network shares"],
      allowedActions: ["read_diagnostics", "read_event_logs"],
      blockedActions: ["delete_files", "format", "overwrite_cloud_versions"],
    },
  },
  {
    id: "server-triage",
    when: (ctx) => ctx.deviceType === "nas_server" || ctx.symptom === "nas_raid_warning",
    output: {
      matchedRule: "server-triage",
      service: "RemoteLab Server Triage",
      mode: "server_triage",
      remoteEligible: true,
      autoRepairBase: false,
      requiresLab: false,
      riskBase: 78,
      priceBaseMin: 399,
      priceBaseMax: 1200,
      reason: "NAS/RAID cases should be diagnosed in read-only mode. Automatic rebuild is forbidden.",
      nextAction: "Collect RAID state, disk health, logs, backups and snapshots.",
      doNotDo: ["Do not rebuild RAID", "Do not initialize drives", "Do not replace multiple drives at once", "Do not write to the array"],
      allowedActions: ["read_diagnostics", "read_smart", "read_event_logs"],
      blockedActions: ["raid_rebuild", "partition_write", "format", "delete_files"],
    },
  },
  {
    id: "cloud-rescue",
    when: (ctx) => ctx.deviceType === "cloud" || ctx.symptom === "cloud_sync_stuck",
    output: {
      matchedRule: "cloud-rescue",
      service: "RemoteLab CloudRescue",
      mode: "remote_fix",
      remoteEligible: true,
      autoRepairBase: true,
      requiresLab: false,
      riskBase: 18,
      priceBaseMin: 149,
      priceBaseMax: 399,
      reason: "Cloud data issues can often be handled through trash, previous versions, conflict detection and sync repair.",
      nextAction: "Check cloud metadata, deleted items, previous versions and sync state.",
      doNotDo: ["Do not permanently empty trash", "Do not overwrite previous versions", "Do not unlink folders before backup"],
      allowedActions: ["read_cloud_metadata", "restart_sync_service"],
      blockedActions: ["overwrite_cloud_versions", "delete_files"],
    },
  },
  {
    id: "outlook-rescue",
    when: (ctx) => ctx.deviceType === "outlook" || ctx.symptom === "outlook_missing_mail",
    output: {
      matchedRule: "outlook-rescue",
      service: "RemoteLab OutlookRescue",
      mode: "remote_fix",
      remoteEligible: true,
      autoRepairBase: true,
      requiresLab: false,
      riskBase: 22,
      priceBaseMin: 199,
      priceBaseMax: 499,
      reason: "Outlook issues are often related to indexing, profile corruption, PST/OST archives or Microsoft 365 sync.",
      nextAction: "Inspect Outlook profile, PST/OST archives and indexing status.",
      doNotDo: ["Do not delete Outlook profiles", "Do not purge PST files", "Do not overwrite archives"],
      allowedActions: ["read_outlook_profile", "reindex_outlook"],
      blockedActions: ["delete_files"],
    },
  },
  {
    id: "diskfix-visible-inaccessible",
    when: (ctx) => ctx.symptom === "drive_detected_inaccessible",
    output: {
      matchedRule: "diskfix-visible-inaccessible",
      service: "RemoteLab DiskFix",
      mode: "remote_fix",
      remoteEligible: true,
      autoRepairBase: true,
      requiresLab: false,
      riskBase: 34,
      priceBaseMin: 99,
      priceBaseMax: 149,
      reason: "A visible but inaccessible drive can be caused by a missing drive letter, mount issue or safe logical conflict.",
      nextAction: "Run read-only disk health checks before offering non-destructive mount repair.",
      doNotDo: ["Do not format", "Do not run CHKDSK", "Do not install recovery software on the affected drive"],
      allowedActions: ["read_diagnostics", "read_smart", "mount_volume", "assign_drive_letter"],
      blockedActions: ["format", "chkdsk_write", "partition_write"],
    },
  },
  {
    id: "format-prompt-safe-scan",
    when: (ctx) => ctx.symptom === "format_prompt",
    output: {
      matchedRule: "format-prompt-safe-scan",
      service: "RemoteLab SafeScan",
      mode: "remote_diagnose",
      remoteEligible: true,
      autoRepairBase: false,
      requiresLab: false,
      riskBase: 56,
      priceBaseMin: 79,
      priceBaseMax: 199,
      reason: "A format prompt may indicate RAW filesystem or file-system damage. Only read-only scan is allowed.",
      nextAction: "Block write actions and run read-only scan.",
      doNotDo: ["Do not click format", "Do not run CHKDSK", "Do not repair partition automatically"],
      allowedActions: ["read_diagnostics", "read_smart"],
      blockedActions: ["format", "chkdsk_write", "partition_write"],
    },
  },
];

function classifyCase(caseId: string, client: z.infer<typeof clientSchema>, intake: z.infer<typeof intakeSchema>) {
  const ctx: RuleContext = { ...intake, clientType: client.type };
  const rule = RULES.find((r) => r.when(ctx));

  const fallback: RuleOutput = {
    matchedRule: "fallback-diagnose",
    service: "RemoteLab Diagnose",
    mode: "remote_diagnose",
    remoteEligible: true,
    autoRepairBase: false,
    requiresLab: false,
    riskBase: 50,
    priceBaseMin: 49,
    priceBaseMax: 149,
    reason: "The issue is not specific enough. RemoteLab should run a diagnostic before recommending repair.",
    nextAction: "Run secure diagnostic and generate a report.",
    doNotDo: ["Do not format", "Do not run random repair tools", "Do not copy new files to affected media"],
    allowedActions: ["read_diagnostics"],
    blockedActions: ["format", "delete_files", "partition_write"],
  };

  const output = rule?.output || fallback;
  let score = output.riskBase;

  if (intake.containsCriticalData) score += 8;
  if (intake.attemptedFix) score += 10;
  if (intake.legalMatter || client.type === "lawyer") score += 12;
  if (client.type === "business") score += 5;
  if (intake.urgency === "emergency") score += 5;

  score = clampRisk(score);

  const multiplier = urgencyMultiplier(intake.urgency);
  const autoRepairAllowed = output.autoRepairBase && score <= CONFIG.maxAutoRepairRisk;

  return {
    id: makeId("triage"),
    caseId,
    matchedRule: output.matchedRule,
    product: CONFIG.product,
    service: output.service,
    mode: output.mode,
    remoteEligible: output.remoteEligible,
    autoRepairAllowed,
    requiresLab: output.requiresLab || !output.remoteEligible,
    riskScore: score,
    riskLabel: riskLabel(score),
    priceMin: Math.round(output.priceBaseMin * multiplier),
    priceMax: Math.round(output.priceBaseMax * multiplier),
    reason: output.reason,
    nextAction: output.nextAction,
    doNotDo: output.doNotDo,
    allowedActions: autoRepairAllowed ? output.allowedActions : output.allowedActions.filter((a) => a.startsWith("read_")),
    blockedActions: output.blockedActions,
  };
}

// ============================================================
// Action policy
// ============================================================

const DANGEROUS_ACTIONS: RemoteAction[] = [
  "format",
  "chkdsk_write",
  "partition_write",
  "raid_rebuild",
  "delete_files",
  "overwrite_cloud_versions",
  "restore_to_same_disk",
  "firmware_reset",
];

function isDangerousAction(action: RemoteAction) {
  return DANGEROUS_ACTIONS.includes(action);
}

function signCommand(payload: object) {
  const secret = process.env.COMMAND_SIGNING_SECRET || "dev-only-change-me";
  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}

// ============================================================
// Diagnostic analysis
// ============================================================

function analyzeDiagnostics(caseId: string, payload: z.infer<typeof diagnosticSchema>, triage: any) {
  let severity: "low" | "medium" | "high" | "critical" = "low";
  const findings: string[] = [];
  const safeActions = new Set<RemoteAction>(triage.allowed_actions || triage.allowedActions || []);
  const blockedActions = new Set<RemoteAction>(triage.blocked_actions || triage.blockedActions || []);

  for (const disk of payload.diagnostics.disks || []) {
    if (!disk.isDetected) {
      severity = "high";
      findings.push("A target disk is not detected. Remote repair is not recommended.");
      blockedActions.add("mount_volume");
      blockedActions.add("assign_drive_letter");
    }

    if (disk.smartStatus === "failed") {
      severity = "critical";
      findings.push("SMART health failed. Automatic repair is blocked and lab escalation is recommended.");
      blockedActions.add("mount_volume");
      blockedActions.add("assign_drive_letter");
      blockedActions.add("chkdsk_write");
      safeActions.delete("mount_volume");
      safeActions.delete("assign_drive_letter");
    }

    if (disk.isDetected && disk.smartStatus !== "failed" && disk.hasMountPoint === false && triage.auto_repair_allowed) {
      findings.push("Disk is detected and has no mount point. Non-destructive mount repair may be possible.");
      safeActions.add("assign_drive_letter");
      safeActions.add("mount_volume");
    }
  }

  if (payload.diagnostics.cloud?.syncStatus === "stuck" && triage.auto_repair_allowed) {
    findings.push("Cloud sync is stuck. Restarting the sync service may be possible.");
    safeActions.add("restart_sync_service");
  }

  if (payload.diagnostics.outlook?.profileDetected && payload.diagnostics.outlook.indexingHealthy === false && triage.auto_repair_allowed) {
    findings.push("Outlook indexing appears unhealthy. Reindexing may be possible.");
    safeActions.add("reindex_outlook");
  }

  const ransomwareExtensions = payload.diagnostics.system?.ransomwareExtensionsDetected || [];
  if (ransomwareExtensions.length > 0) {
    severity = "critical";
    findings.push(`Ransomware-like extensions detected: ${ransomwareExtensions.join(", ")}.`);
    blockedActions.add("delete_files");
    blockedActions.add("format");
  }

  for (const action of Array.from(safeActions)) {
    if (isDangerousAction(action)) safeActions.delete(action);
    if (blockedActions.has(action)) safeActions.delete(action);
  }

  let recommendedStatus: CaseStatus = "diagnostic_received";
  if (severity === "critical" || severity === "high" || triage.requires_lab) {
    recommendedStatus = "lab_required";
  } else if (Array.from(safeActions).some((a) => !a.startsWith("read_"))) {
    recommendedStatus = "remote_repair_allowed";
  }

  return {
    id: makeId("report"),
    caseId,
    severity,
    title: "NEXURA RemoteLab Diagnostic Report",
    summary: findings.length ? findings.join(" ") : "No critical risk indicators detected in the submitted diagnostics.",
    recommendedStatus,
    safeActionsToOffer: Array.from(safeActions),
    blockedActions: Array.from(blockedActions),
  };
}

// ============================================================
// Express app
// ============================================================

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function asyncRoute(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => fn(req, res).catch((error) => {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal server error" });
  });
}

app.get("/health", asyncRoute(async (_req, res) => {
  const dbCheck = await pool.query("select now() as now");
  res.json({ ok: true, product: CONFIG.product, dbTime: dbCheck.rows[0].now });
}));

app.post("/api/migrate", asyncRoute(async (_req, res) => {
  await pool.query(SCHEMA_SQL);
  res.json({ ok: true, message: "Neon schema migrated" });
}));

app.post("/api/cases", asyncRoute(async (req, res) => {
  const body = createCaseSchema.parse(req.body);
  const clientId = makeId("client");
  const caseId = makeId("NX");
  const triage = classifyCase(caseId, body.client, body.intake);

  const client = await pool.connect();
  try {
    await client.query("begin");

    await client.query(
      `insert into clients (id, name, email, phone, type) values ($1,$2,$3,$4,$5)`,
      [clientId, body.client.name, body.client.email, body.client.phone || null, body.client.type]
    );

    await client.query(
      `insert into cases (
        id, client_id, status, device_type, symptom, urgency,
        contains_critical_data, attempted_fix, legal_matter, notes
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        caseId,
        clientId,
        "triage_completed",
        body.intake.deviceType,
        body.intake.symptom,
        body.intake.urgency,
        body.intake.containsCriticalData,
        body.intake.attemptedFix,
        body.intake.legalMatter,
        body.intake.notes || null,
      ]
    );

    await client.query(
      `insert into triage_results (
        id, case_id, matched_rule, product, service, mode,
        remote_eligible, auto_repair_allowed, requires_lab,
        risk_score, risk_label, price_min, price_max,
        reason, next_action, do_not_do, allowed_actions, blocked_actions
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        triage.id,
        caseId,
        triage.matchedRule,
        triage.product,
        triage.service,
        triage.mode,
        triage.remoteEligible,
        triage.autoRepairAllowed,
        triage.requiresLab,
        triage.riskScore,
        triage.riskLabel,
        triage.priceMin,
        triage.priceMax,
        triage.reason,
        triage.nextAction,
        safeJson(triage.doNotDo),
        safeJson(triage.allowedActions),
        safeJson(triage.blockedActions),
      ]
    );

    await client.query(
      `insert into audit_logs (id, case_id, actor, event, metadata) values ($1,$2,$3,$4,$5)`,
      [makeId("log"), caseId, "system", "case_created_and_triaged", { clientId, service: triage.service, riskScore: triage.riskScore }]
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  res.status(201).json({ clientId, caseId, triage });
}));

app.post("/api/sessions", asyncRoute(async (req, res) => {
  const body = createSessionSchema.parse(req.body);

  const triageResult = await pool.query(`select * from triage_results where case_id = $1 order by created_at desc limit 1`, [body.caseId]);
  if (!triageResult.rowCount) return res.status(404).json({ error: "Triage not found" });

  const triage = triageResult.rows[0];
  const token = rawToken();
  const sessionId = makeId("session");
  const publicUrl = `${CONFIG.baseUrl}/session/${body.caseId}?session=${sessionId}&token=${token}`;

  await pool.query(
    `insert into remote_sessions (id, case_id, token_hash, public_url, status, allowed_actions, expires_at)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [sessionId, body.caseId, hashToken(token), publicUrl, "waiting_for_consent", safeJson(triage.allowed_actions), addMinutes(CONFIG.tokenTtlMinutes)]
  );

  await pool.query(`update cases set status = $1, updated_at = now() where id = $2`, ["session_created", body.caseId]);
  await audit(body.caseId, "system", "remote_session_created", { sessionId });

  // In production, send this with Resend.
  const email = {
    subject: `Secure RemoteLab diagnostic available - case ${body.caseId}`,
    body: `Your secure RemoteLab link is ready: ${publicUrl}\n\nDo not format, run CHKDSK, or copy files to the affected media.`,
  };

  res.status(201).json({ sessionId, publicUrl, email });
}));

app.post("/api/consent", asyncRoute(async (req, res) => {
  const body = consentSchema.parse(req.body);

  const sessionResult = await pool.query(`select * from remote_sessions where id = $1 and case_id = $2`, [body.sessionId, body.caseId]);
  if (!sessionResult.rowCount) return res.status(404).json({ error: "Session not found" });

  const session = sessionResult.rows[0];
  if (new Date(session.expires_at) < new Date()) return res.status(410).json({ error: "Session expired" });
  if (session.token_hash !== hashToken(body.token)) return res.status(401).json({ error: "Invalid token" });

  const caseResult = await pool.query(
    `select c.email from clients c join cases k on k.client_id = c.id where k.id = $1`,
    [body.caseId]
  );
  const clientEmail = caseResult.rows[0]?.email || "unknown";

  const consentId = makeId("consent");
  await pool.query(
    `insert into consents (id, case_id, session_id, client_email, ip_address, user_agent, accepted_terms_version)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [consentId, body.caseId, body.sessionId, clientEmail, req.ip, req.get("user-agent") || null, CONFIG.termsVersion]
  );

  await pool.query(`update remote_sessions set status = $1 where id = $2`, ["consent_given", body.sessionId]);
  await pool.query(`update cases set status = $1, updated_at = now() where id = $2`, ["consent_given", body.caseId]);
  await audit(body.caseId, "client", "consent_given", { sessionId: body.sessionId, consentId });

  res.status(201).json({ ok: true, consentId });
}));

app.post("/api/agent/diagnostics", asyncRoute(async (req, res) => {
  const body = diagnosticSchema.parse(req.body);

  const sessionResult = await pool.query(`select * from remote_sessions where id = $1 and case_id = $2`, [body.sessionId, body.caseId]);
  if (!sessionResult.rowCount) return res.status(404).json({ error: "Session not found" });
  const session = sessionResult.rows[0];

  if (session.token_hash !== hashToken(body.token)) return res.status(401).json({ error: "Invalid session token" });
  if (session.status !== "consent_given") return res.status(403).json({ error: "Consent required before diagnostics" });

  const triageResult = await pool.query(`select * from triage_results where case_id = $1 order by created_at desc limit 1`, [body.caseId]);
  if (!triageResult.rowCount) return res.status(404).json({ error: "Triage not found" });

  const report = analyzeDiagnostics(body.caseId, body, triageResult.rows[0]);

  await pool.query(
    `insert into diagnostic_reports (
      id, case_id, severity, title, summary, recommended_status,
      safe_actions_to_offer, blocked_actions, raw_payload
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      report.id,
      body.caseId,
      report.severity,
      report.title,
      report.summary,
      report.recommendedStatus,
      safeJson(report.safeActionsToOffer),
      safeJson(report.blockedActions),
      safeJson(body),
    ]
  );

  await pool.query(`update cases set status = $1, updated_at = now() where id = $2`, [report.recommendedStatus, body.caseId]);
  await audit(body.caseId, "agent", "diagnostic_received", { reportId: report.id, severity: report.severity });

  res.status(201).json({ report });
}));

app.post("/api/commands", asyncRoute(async (req, res) => {
  const body = createCommandSchema.parse(req.body);

  if (isDangerousAction(body.action as RemoteAction)) {
    return res.status(403).json({ error: `Dangerous action blocked by RemoteLab policy: ${body.action}` });
  }

  const sessionResult = await pool.query(`select * from remote_sessions where id = $1 and case_id = $2`, [body.sessionId, body.caseId]);
  if (!sessionResult.rowCount) return res.status(404).json({ error: "Session not found" });
  const session = sessionResult.rows[0];

  const reportResult = await pool.query(`select * from diagnostic_reports where case_id = $1 order by created_at desc limit 1`, [body.caseId]);
  if (!reportResult.rowCount) return res.status(404).json({ error: "Diagnostic report required" });
  const report = reportResult.rows[0];

  const safeActions = report.safe_actions_to_offer || [];
  const blockedActions = report.blocked_actions || [];

  if (blockedActions.includes(body.action)) {
    return res.status(403).json({ error: "Action blocked by diagnostic report" });
  }

  if (!safeActions.includes(body.action)) {
    return res.status(403).json({ error: "Action not offered as safe by diagnostic report" });
  }

  if (!body.paymentApproved && !String(body.action).startsWith("read_")) {
    return res.status(402).json({ error: "Payment required before repair command" });
  }

  const commandId = makeId("cmd");
  const payload = {
    commandId,
    caseId: body.caseId,
    sessionId: body.sessionId,
    action: body.action,
    nonce: rawToken(),
  };
  const signature = signCommand(payload);

  await pool.query(
    `insert into agent_commands (id, case_id, session_id, action, status, payload, server_signature, expires_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [commandId, body.caseId, body.sessionId, body.action, "queued", safeJson(payload), signature, addMinutes(CONFIG.commandTtlMinutes)]
  );

  await audit(body.caseId, "operator", "agent_command_created", { commandId, action: body.action });

  res.status(201).json({ commandId, payload, signature, expiresAt: addMinutes(CONFIG.commandTtlMinutes) });
}));

app.get("/api/cases/:caseId", asyncRoute(async (req, res) => {
  const caseId = req.params.caseId;

  const [caseResult, triageResult, sessionResult, reportResult, auditResult, commandResult] = await Promise.all([
    pool.query(`select * from cases where id = $1`, [caseId]),
    pool.query(`select * from triage_results where case_id = $1 order by created_at desc`, [caseId]),
    pool.query(`select id, case_id, public_url, status, allowed_actions, expires_at, created_at from remote_sessions where case_id = $1 order by created_at desc`, [caseId]),
    pool.query(`select * from diagnostic_reports where case_id = $1 order by created_at desc`, [caseId]),
    pool.query(`select * from audit_logs where case_id = $1 order by created_at desc`, [caseId]),
    pool.query(`select * from agent_commands where case_id = $1 order by created_at desc`, [caseId]),
  ]);

  if (!caseResult.rowCount) return res.status(404).json({ error: "Case not found" });

  res.json({
    case: caseResult.rows[0],
    triage: triageResult.rows,
    sessions: sessionResult.rows,
    reports: reportResult.rows,
    commands: commandResult.rows,
    audit: auditResult.rows,
  });
}));

app.get("/api/catalog", (_req, res) => {
  res.json({
    product: CONFIG.product,
    platform: "NEXURA RemoteLab + NEXURA Monitor",
    offers: [
      { id: "diagnose", name: "RemoteLab Diagnose", price: "49 $", purpose: "Read-only risk and recovery assessment" },
      { id: "fix", name: "RemoteLab Fix", price: "99 $ - 499 $", purpose: "Safe non-destructive repair" },
      { id: "server", name: "RemoteLab Server Triage", price: "399 $ - 1 200 $", purpose: "NAS/RAID/server read-only triage" },
      { id: "ransomware", name: "RemoteLab Ransomware First Response", price: "499 $ - 2 500 $", purpose: "Incident triage and recovery planning" },
      { id: "monitor_basic", name: "NEXURA Monitor Basic", price: "49 $ / month", purpose: "One workstation, disk space and SMART alerts" },
      { id: "monitor_business", name: "NEXURA Monitor Business", price: "199 $ / month", purpose: "Up to 10 assets, backups, cloud sync and monthly report" },
      { id: "monitor_server", name: "NEXURA Monitor Server", price: "499 $ / month", purpose: "NAS/server/RAID monitoring, backup checks and priority triage" },
    ],
  });
});

// ============================================================
// NEXURA Monitor endpoints
// ============================================================

const createMonitoringAccountSchema = z.object({
  client: clientSchema,
  plan: z.enum(["basic", "business", "server"]),
});

const registerMonitoringAgentSchema = z.object({
  monitoringAccountId: z.string().min(4),
  hostname: z.string().min(2).max(120),
  platform: z.enum(["windows", "macos", "linux", "nas", "server"]),
  agentVersion: z.string().min(3).max(30),
});

const healthCheckSchema = z.object({
  monitoringAccountId: z.string().min(4),
  agentId: z.string().min(4),
  asset: z.object({
    assetId: z.string().optional(),
    assetType: z.enum(["workstation", "server", "nas", "external_drive", "cloud_account", "mailbox"]),
    displayName: z.string().min(2).max(160),
    serial: z.string().optional(),
    model: z.string().optional(),
  }),
  metrics: z.object({
    smartStatus: z.enum(["passed", "warning", "failed", "unknown"]).optional(),
    freeSpacePercent: z.number().min(0).max(100).optional(),
    backupStatus: z.enum(["healthy", "stale", "failed", "unknown"]).optional(),
    raidStatus: z.enum(["healthy", "degraded", "failed", "unknown"]).optional(),
    cloudSyncStatus: z.enum(["healthy", "stuck", "conflict", "unknown"]).optional(),
    ransomwareIndicators: z.number().min(0).optional(),
    criticalEventsLast24h: z.number().min(0).optional(),
  }),
});

function planDetails(plan: "basic" | "business" | "server") {
  if (plan === "server") return { id: "plan_server", name: "NEXURA Monitor Server", monthly: 499, maxAssets: 25 };
  if (plan === "business") return { id: "plan_business", name: "NEXURA Monitor Business", monthly: 199, maxAssets: 10 };
  return { id: "plan_basic", name: "NEXURA Monitor Basic", monthly: 49, maxAssets: 1 };
}

function classifyHealthAlert(metrics: z.infer<typeof healthCheckSchema>["metrics"], assetType: string) {
  const alerts: Array<{
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    recommendedService: string;
    priceMin: number;
    priceMax: number;
  }> = [];

  if (metrics.smartStatus === "failed") {
    alerts.push({
      severity: "critical",
      title: "Critical disk health failure detected",
      description: "SMART reports a failed disk. Continued use may reduce recovery chances.",
      recommendedService: "NEXURA Laboratory Recovery / Emergency Disk Replacement",
      priceMin: 649,
      priceMax: 5000,
    });
  }

  if (metrics.smartStatus === "warning") {
    alerts.push({
      severity: "high",
      title: "Disk health warning detected",
      description: "SMART warning indicates a possible upcoming drive failure.",
      recommendedService: "RemoteLab Diagnose + Backup Verification",
      priceMin: 49,
      priceMax: 399,
    });
  }

  if (typeof metrics.freeSpacePercent === "number" && metrics.freeSpacePercent < 8) {
    alerts.push({
      severity: metrics.freeSpacePercent < 3 ? "critical" : "medium",
      title: "Low free disk space",
      description: `Only ${metrics.freeSpacePercent}% free space remains. This can break backups, sync and databases.`,
      recommendedService: "NEXURA System Health Repair",
      priceMin: 99,
      priceMax: 249,
    });
  }

  if (metrics.backupStatus === "failed" || metrics.backupStatus === "stale") {
    alerts.push({
      severity: metrics.backupStatus === "failed" ? "high" : "medium",
      title: "Backup problem detected",
      description: `Backup status is ${metrics.backupStatus}. This increases business data-loss exposure.`,
      recommendedService: "NEXURA Backup Recovery Readiness Check",
      priceMin: 199,
      priceMax: 799,
    });
  }

  if (metrics.raidStatus === "degraded" || metrics.raidStatus === "failed") {
    alerts.push({
      severity: metrics.raidStatus === "failed" ? "critical" : "high",
      title: "RAID/NAS health issue detected",
      description: `RAID status is ${metrics.raidStatus}. Automatic rebuild should not be attempted without expert review.`,
      recommendedService: "RemoteLab Server Triage",
      priceMin: 399,
      priceMax: 1200,
    });
  }

  if (metrics.cloudSyncStatus === "stuck" || metrics.cloudSyncStatus === "conflict") {
    alerts.push({
      severity: "medium",
      title: "Cloud sync issue detected",
      description: `Cloud sync status is ${metrics.cloudSyncStatus}. Files may be missing, duplicated or stale.`,
      recommendedService: "RemoteLab CloudRescue",
      priceMin: 149,
      priceMax: 399,
    });
  }

  if ((metrics.ransomwareIndicators || 0) > 0) {
    alerts.push({
      severity: "critical",
      title: "Possible ransomware indicators detected",
      description: `${metrics.ransomwareIndicators} ransomware indicators were reported by the monitoring agent.`,
      recommendedService: "RemoteLab Ransomware First Response",
      priceMin: 499,
      priceMax: 2500,
    });
  }

  if (alerts.length === 0 && (metrics.criticalEventsLast24h || 0) > 10) {
    alerts.push({
      severity: "medium",
      title: "Elevated system errors detected",
      description: `${metrics.criticalEventsLast24h} critical events were reported in the last 24 hours.`,
      recommendedService: "RemoteLab Diagnose",
      priceMin: 49,
      priceMax: 149,
    });
  }

  return alerts;
}

app.post("/api/monitoring/accounts", asyncRoute(async (req, res) => {
  const body = createMonitoringAccountSchema.parse(req.body);
  const plan = planDetails(body.plan);
  const clientId = makeId("client");
  const accountId = makeId("monacct");

  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query(
      `insert into clients (id, name, email, phone, type) values ($1,$2,$3,$4,$5)`,
      [clientId, body.client.name, body.client.email, body.client.phone || null, body.client.type]
    );
    await db.query(
      `insert into monitoring_plans (id, name, monthly_price_cad, max_assets, features)
       values ($1,$2,$3,$4,$5)
       on conflict (id) do update set name = excluded.name, monthly_price_cad = excluded.monthly_price_cad, max_assets = excluded.max_assets`,
      [plan.id, plan.name, plan.monthly, plan.maxAssets, safeJson(["health_alerts", "monthly_report", "remote_lab_upsell"])]
    );
    await db.query(
      `insert into monitoring_accounts (id, client_id, plan_id, status) values ($1,$2,$3,$4)`,
      [accountId, clientId, plan.id, "trial"]
    );
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }

  res.status(201).json({ clientId, monitoringAccountId: accountId, plan });
}));

app.post("/api/monitoring/agents/register", asyncRoute(async (req, res) => {
  const body = registerMonitoringAgentSchema.parse(req.body);
  const agentId = makeId("agent");
  const agentKey = rawToken();

  await pool.query(
    `insert into monitoring_agents (
      id, monitoring_account_id, agent_key_hash, hostname, platform, agent_version, status, last_seen_at
    ) values ($1,$2,$3,$4,$5,$6,$7,now())`,
    [agentId, body.monitoringAccountId, hashToken(agentKey), body.hostname, body.platform, body.agentVersion, "active"]
  );

  res.status(201).json({
    agentId,
    agentKey,
    warning: "Store this key once. In production, show it only on creation.",
  });
}));

app.post("/api/monitoring/health", asyncRoute(async (req, res) => {
  const body = healthCheckSchema.parse(req.body);
  const assetId = body.asset.assetId || makeId("asset");

  const alerts = classifyHealthAlert(body.metrics, body.asset.assetType);
  const worstSeverity = alerts[0]?.severity || "info";
  const assetStatus = alerts.some((a) => a.severity === "critical")
    ? "critical"
    : alerts.some((a) => a.severity === "high" || a.severity === "medium")
      ? "warning"
      : "healthy";

  const db = await pool.connect();
  try {
    await db.query("begin");

    await db.query(
      `insert into monitored_assets (
        id, monitoring_account_id, agent_id, asset_type, display_name, serial, model, metadata, status
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      on conflict (id) do update set
        display_name = excluded.display_name,
        serial = excluded.serial,
        model = excluded.model,
        metadata = excluded.metadata,
        status = excluded.status,
        updated_at = now()`,
      [
        assetId,
        body.monitoringAccountId,
        body.agentId,
        body.asset.assetType,
        body.asset.displayName,
        body.asset.serial || null,
        body.asset.model || null,
        safeJson(body.metrics),
        assetStatus,
      ]
    );

    const checkId = makeId("check");
    await db.query(
      `insert into health_checks (
        id, monitoring_account_id, asset_id, agent_id, check_type, severity, summary, metrics
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        checkId,
        body.monitoringAccountId,
        assetId,
        body.agentId,
        "agent_health_snapshot",
        worstSeverity,
        alerts.length ? `${alerts.length} alert(s) generated.` : "Asset is healthy.",
        safeJson(body.metrics),
      ]
    );

    const createdAlerts = [];
    for (const alert of alerts) {
      const alertId = makeId("alert");
      await db.query(
        `insert into health_alerts (
          id, monitoring_account_id, asset_id, source_check_id, severity, title, description,
          recommended_service, recommended_price_min, recommended_price_max, status
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          alertId,
          body.monitoringAccountId,
          assetId,
          checkId,
          alert.severity,
          alert.title,
          alert.description,
          alert.recommendedService,
          alert.priceMin,
          alert.priceMax,
          "open",
        ]
      );
      createdAlerts.push({ alertId, ...alert });
    }

    await db.query(`update monitoring_agents set last_seen_at = now(), status = 'active' where id = $1`, [body.agentId]);
    await db.query("commit");

    res.status(201).json({ assetId, checkId, assetStatus, alerts: createdAlerts });
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }
}));

app.get("/api/monitoring/accounts/:accountId/dashboard", asyncRoute(async (req, res) => {
  const accountId = req.params.accountId;
  const [account, assets, alerts, checks] = await Promise.all([
    pool.query(
      `select ma.*, c.name as client_name, c.email as client_email, mp.name as plan_name, mp.monthly_price_cad
       from monitoring_accounts ma
       join clients c on c.id = ma.client_id
       left join monitoring_plans mp on mp.id = ma.plan_id
       where ma.id = $1`,
      [accountId]
    ),
    pool.query(`select * from monitored_assets where monitoring_account_id = $1 order by updated_at desc`, [accountId]),
    pool.query(`select * from health_alerts where monitoring_account_id = $1 order by created_at desc limit 50`, [accountId]),
    pool.query(`select * from health_checks where monitoring_account_id = $1 order by created_at desc limit 50`, [accountId]),
  ]);

  if (!account.rowCount) return res.status(404).json({ error: "Monitoring account not found" });

  const openAlerts = alerts.rows.filter((a) => a.status === "open");
  const criticalAlerts = openAlerts.filter((a) => a.severity === "critical");
  const highAlerts = openAlerts.filter((a) => a.severity === "high");

  res.json({
    account: account.rows[0],
    summary: {
      assets: assets.rowCount,
      openAlerts: openAlerts.length,
      criticalAlerts: criticalAlerts.length,
      highAlerts: highAlerts.length,
      estimatedServiceOpportunityCad: openAlerts.reduce((sum, a) => sum + Number(a.recommended_price_min || 0), 0),
    },
    assets: assets.rows,
    alerts: alerts.rows,
    recentChecks: checks.rows,
  });
}));

app.post("/api/monitoring/alerts/:alertId/convert-to-case", asyncRoute(async (req, res) => {
  const alertId = req.params.alertId;
  const alertResult = await pool.query(
    `select ha.*, ma.client_id
     from health_alerts ha
     join monitoring_accounts ma on ma.id = ha.monitoring_account_id
     where ha.id = $1`,
    [alertId]
  );
  if (!alertResult.rowCount) return res.status(404).json({ error: "Alert not found" });
  const alert = alertResult.rows[0];

  const caseId = makeId("NX");
  await pool.query(
    `insert into cases (
      id, client_id, status, device_type, symptom, urgency,
      contains_critical_data, attempted_fix, legal_matter, notes
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      caseId,
      alert.client_id,
      "case_created",
      alert.recommended_service.includes("Server") ? "nas_server" : "windows_pc",
      alert.recommended_service.includes("Ransomware") ? "encrypted_files" : "system_slow_errors",
      alert.severity === "critical" ? "emergency" : "priority",
      true,
      false,
      false,
      `Created from NEXURA Monitor alert ${alertId}: ${alert.title}. ${alert.description}`,
    ]
  );

  await pool.query(
    `update health_alerts set status = 'converted_to_case', created_case_id = $1, updated_at = now() where id = $2`,
    [caseId, alertId]
  );

  await audit(caseId, "system", "monitoring_alert_converted_to_case", { alertId });

  res.status(201).json({ caseId, alertId });
}));

// ============================================================
// Opportunity Engine
// ============================================================

type OpportunityInput = {
  sourceType: "triage" | "diagnostic_report" | "monitoring_alert" | "manual";
  sourceId?: string;
  caseId?: string;
  monitoringAccountId?: string;
  clientId?: string;
  title: string;
  recommendedService: string;
  description: string;
  estimatedValueMin: number;
  estimatedValueMax: number;
  probability: number;
  priority: "low" | "medium" | "high" | "critical";
  nextBestAction: string;
};

function priorityFromRisk(riskScore: number): "low" | "medium" | "high" | "critical" {
  if (riskScore >= 85) return "critical";
  if (riskScore >= 70) return "high";
  if (riskScore >= 45) return "medium";
  return "low";
}

function probabilityFromPriority(priority: "low" | "medium" | "high" | "critical") {
  if (priority === "critical") return 0.82;
  if (priority === "high") return 0.68;
  if (priority === "medium") return 0.46;
  return 0.28;
}

function buildOpportunityFromTriage(triage: any, clientId?: string): OpportunityInput {
  const priority = priorityFromRisk(Number(triage.risk_score || triage.riskScore || 50));
  const requiresLab = Boolean(triage.requires_lab ?? triage.requiresLab);
  const service = String(triage.service || "RemoteLab Diagnose");

  let nextBestAction = "Send secure RemoteLab diagnostic link.";
  if (requiresLab) nextBestAction = "Call client and send laboratory intake instructions.";
  if (service.includes("Server")) nextBestAction = "Call business client and propose Server Triage.";
  if (service.includes("Ransomware")) nextBestAction = "Call immediately and propose First Response.";

  return {
    sourceType: "triage",
    sourceId: triage.id,
    caseId: triage.case_id || triage.caseId,
    clientId,
    title: `${service} opportunity`,
    recommendedService: service,
    description: `${triage.reason || "RemoteLab triage completed."} Next action: ${triage.next_action || triage.nextAction || nextBestAction}`,
    estimatedValueMin: Number(triage.price_min || triage.priceMin || 49),
    estimatedValueMax: Number(triage.price_max || triage.priceMax || 149),
    probability: probabilityFromPriority(priority),
    priority,
    nextBestAction,
  };
}

function buildMonitorUpsellOpportunity(args: {
  caseId?: string;
  clientId?: string;
  clientType?: string;
  service?: string;
  riskScore?: number;
}): OpportunityInput | null {
  const businessLike = args.clientType === "business" || args.service?.includes("Server") || (args.riskScore || 0) >= 70;
  if (!businessLike) return null;

  return {
    sourceType: "manual",
    caseId: args.caseId,
    clientId: args.clientId,
    title: "NEXURA Monitor upsell",
    recommendedService: args.service?.includes("Server") ? "NEXURA Monitor Server" : "NEXURA Monitor Business",
    description: "Client has a qualifying incident or business-critical risk. Offer recurring monitoring to prevent future data loss.",
    estimatedValueMin: args.service?.includes("Server") ? 499 : 199,
    estimatedValueMax: args.service?.includes("Server") ? 5988 : 2388,
    probability: args.service?.includes("Server") ? 0.58 : 0.42,
    priority: args.service?.includes("Server") ? "high" : "medium",
    nextBestAction: "Offer monthly monitoring after resolving the current issue.",
  };
}

async function insertOpportunity(opportunity: OpportunityInput) {
  const id = makeId("opp");
  await pool.query(
    `insert into service_opportunities (
      id, source_type, source_id, case_id, monitoring_account_id, client_id,
      title, recommended_service, description,
      estimated_value_min, estimated_value_max, probability, priority,
      next_best_action, status
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      id,
      opportunity.sourceType,
      opportunity.sourceId || null,
      opportunity.caseId || null,
      opportunity.monitoringAccountId || null,
      opportunity.clientId || null,
      opportunity.title,
      opportunity.recommendedService,
      opportunity.description,
      opportunity.estimatedValueMin,
      opportunity.estimatedValueMax,
      opportunity.probability,
      opportunity.priority,
      opportunity.nextBestAction,
      "open",
    ]
  );
  return { id, ...opportunity, status: "open" };
}

app.post("/api/cases/:caseId/opportunities/rebuild", asyncRoute(async (req, res) => {
  const caseId = req.params.caseId;
  const caseResult = await pool.query(
    `select k.*, c.type as client_type from cases k join clients c on c.id = k.client_id where k.id = $1`,
    [caseId]
  );
  if (!caseResult.rowCount) return res.status(404).json({ error: "Case not found" });

  const triageResult = await pool.query(`select * from triage_results where case_id = $1 order by created_at desc limit 1`, [caseId]);
  if (!triageResult.rowCount) return res.status(404).json({ error: "Triage not found" });

  const remoteLabOpp = await insertOpportunity(buildOpportunityFromTriage(triageResult.rows[0], caseResult.rows[0].client_id));
  const monitorUpsell = buildMonitorUpsellOpportunity({
    caseId,
    clientId: caseResult.rows[0].client_id,
    clientType: caseResult.rows[0].client_type,
    service: triageResult.rows[0].service,
    riskScore: triageResult.rows[0].risk_score,
  });
  const opportunities = [remoteLabOpp];
  if (monitorUpsell) opportunities.push(await insertOpportunity(monitorUpsell));

  await audit(caseId, "system", "opportunities_rebuilt", { opportunities: opportunities.map((o) => o.id) });
  res.status(201).json({ opportunities });
}));

app.get("/api/admin/opportunities", asyncRoute(async (req, res) => {
  const status = String(req.query.status || "open");
  const result = await pool.query(
    `select so.*, c.name as client_name, c.email as client_email
     from service_opportunities so
     left join clients c on c.id = so.client_id
     where so.status = $1
     order by
       case so.priority when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
       so.created_at desc
     limit 100`,
    [status]
  );

  const pipeline = result.rows.reduce((acc, opp) => {
    acc.min += Number(opp.estimated_value_min || 0);
    acc.max += Number(opp.estimated_value_max || 0);
    acc.weighted += Math.round(Number(opp.estimated_value_min || 0) * Number(opp.probability || 0));
    return acc;
  }, { min: 0, max: 0, weighted: 0 });

  res.json({ status, pipeline, opportunities: result.rows });
}));

app.patch("/api/admin/opportunities/:opportunityId", asyncRoute(async (req, res) => {
  const schema = z.object({
    status: z.enum(["open", "contacted", "quoted", "won", "lost", "dismissed"]),
  });
  const body = schema.parse(req.body);
  const opportunityId = req.params.opportunityId;

  const result = await pool.query(
    `update service_opportunities set status = $1, updated_at = now() where id = $2 returning *`,
    [body.status, opportunityId]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Opportunity not found" });

  const opp = result.rows[0];
  if (opp.case_id) await audit(opp.case_id, "operator", "opportunity_status_updated", { opportunityId, status: body.status });
  res.json({ opportunity: opp });
}));

// ============================================================
// Admin revenue dashboard
// ============================================================

app.get("/api/admin/dashboard", asyncRoute(async (_req, res) => {
  const [cases, sessions, reports, alerts, opportunities, monitorAccounts] = await Promise.all([
    pool.query(`select status, count(*)::int as count from cases group by status`),
    pool.query(`select status, count(*)::int as count from remote_sessions group by status`),
    pool.query(`select severity, count(*)::int as count from diagnostic_reports group by severity`),
    pool.query(`select severity, status, count(*)::int as count from health_alerts group by severity, status`),
    pool.query(`select status, priority, count(*)::int as count, coalesce(sum(estimated_value_min),0)::int as min_value, coalesce(sum(estimated_value_max),0)::int as max_value from service_opportunities group by status, priority`),
    pool.query(`select status, count(*)::int as count from monitoring_accounts group by status`),
  ]);

  const openPipeline = await pool.query(
    `select
      coalesce(sum(estimated_value_min),0)::int as min_value,
      coalesce(sum(estimated_value_max),0)::int as max_value,
      coalesce(sum((estimated_value_min * probability)::int),0)::int as weighted_value
     from service_opportunities
     where status in ('open','contacted','quoted')`
  );

  const urgentWork = await pool.query(
    `select so.*, c.name as client_name, c.email as client_email
     from service_opportunities so
     left join clients c on c.id = so.client_id
     where so.status in ('open','contacted') and so.priority in ('critical','high')
     order by case so.priority when 'critical' then 1 else 2 end, so.created_at desc
     limit 10`
  );

  res.json({
    overview: {
      casesByStatus: cases.rows,
      sessionsByStatus: sessions.rows,
      reportsBySeverity: reports.rows,
      alertsBySeverityStatus: alerts.rows,
      opportunitiesByStatusPriority: opportunities.rows,
      monitoringAccountsByStatus: monitorAccounts.rows,
      openPipeline: openPipeline.rows[0],
    },
    urgentWork: urgentWork.rows,
  });
}));

// ============================================================
// Report generation MVP
// ============================================================

function moneyRange(min?: number, max?: number) {
  return `${Number(min || 0)} $ - ${Number(max || 0)} $ CAD`;
}

async function buildCaseReportMarkdown(caseId: string) {
  const [caseResult, clientResult, triageResult, reportResult, commandResult, auditResult] = await Promise.all([
    pool.query(`select * from cases where id = $1`, [caseId]),
    pool.query(`select c.* from clients c join cases k on k.client_id = c.id where k.id = $1`, [caseId]),
    pool.query(`select * from triage_results where case_id = $1 order by created_at desc limit 1`, [caseId]),
    pool.query(`select * from diagnostic_reports where case_id = $1 order by created_at desc limit 1`, [caseId]),
    pool.query(`select * from agent_commands where case_id = $1 order by created_at desc`, [caseId]),
    pool.query(`select * from audit_logs where case_id = $1 order by created_at asc`, [caseId]),
  ]);

  if (!caseResult.rowCount) throw new Error("Case not found");
  const k = caseResult.rows[0];
  const c = clientResult.rows[0];
  const t = triageResult.rows[0];
  const r = reportResult.rows[0];

  return `# NEXURA RemoteLab Report

## Case
- Case ID: ${caseId}
- Status: ${k.status}
- Client: ${c?.name || "Unknown"}
- Email: ${c?.email || "Unknown"}
- Device type: ${k.device_type}
- Symptom: ${k.symptom}
- Urgency: ${k.urgency}

## Triage
- Service: ${t?.service || "Not available"}
- Mode: ${t?.mode || "Not available"}
- Risk: ${t?.risk_label || "Unknown"} (${t?.risk_score ?? "n/a"}/100)
- Estimated value: ${moneyRange(t?.price_min, t?.price_max)}
- Reason: ${t?.reason || "Not available"}
- Next action: ${t?.next_action || "Not available"}

## Do Not Do
${Array.isArray(t?.do_not_do) ? t.do_not_do.map((x: string) => `- ${x}`).join("
") : "- Do not perform destructive actions."}

## Diagnostic Findings
- Severity: ${r?.severity || "No diagnostic report yet"}
- Summary: ${r?.summary || "No diagnostic report yet"}

## Safe Actions Offered
${Array.isArray(r?.safe_actions_to_offer) && r.safe_actions_to_offer.length ? r.safe_actions_to_offer.map((x: string) => `- ${x}`).join("
") : "- None"}

## Blocked Actions
${Array.isArray(r?.blocked_actions) && r.blocked_actions.length ? r.blocked_actions.map((x: string) => `- ${x}`).join("
") : "- Destructive actions remain blocked by policy"}

## Commands
${commandResult.rows.length ? commandResult.rows.map((cmd) => `- ${cmd.action}: ${cmd.status}`).join("
") : "- No commands issued"}

## Audit Timeline
${auditResult.rows.map((log) => `- ${new Date(log.created_at).toISOString()} — ${log.actor}: ${log.event}`).join("
")}

---
Generated by NEXURA RemoteLab.
`;
}

app.post("/api/reports/cases/:caseId", asyncRoute(async (req, res) => {
  const caseId = req.params.caseId;
  const markdown = await buildCaseReportMarkdown(caseId);
  const reportId = makeId("genreport");

  await pool.query(
    `insert into generated_reports (id, case_id, report_type, title, body_markdown, metadata)
     values ($1,$2,$3,$4,$5,$6)`,
    [reportId, caseId, "remotelab_diagnostic", "NEXURA RemoteLab Report", markdown, safeJson({ generatedBy: "api" })]
  );

  await audit(caseId, "system", "report_generated", { reportId });
  res.status(201).json({ reportId, markdown });
}));

app.get("/api/reports/:reportId", asyncRoute(async (req, res) => {
  const result = await pool.query(`select * from generated_reports where id = $1`, [req.params.reportId]);
  if (!result.rowCount) return res.status(404).json({ error: "Report not found" });
  res.json({ report: result.rows[0] });
}));

// ============================================================
// Quote MVP
// ============================================================

app.post("/api/opportunities/:opportunityId/quote", asyncRoute(async (req, res) => {
  const schema = z.object({
    amountCad: z.number().int().positive().optional(),
  });
  const body = schema.parse(req.body);
  const opportunityId = req.params.opportunityId;

  const oppResult = await pool.query(`select * from service_opportunities where id = $1`, [opportunityId]);
  if (!oppResult.rowCount) return res.status(404).json({ error: "Opportunity not found" });
  const opp = oppResult.rows[0];

  const quoteId = makeId("quote");
  const amount = body.amountCad || Number(opp.estimated_value_min || 0);
  const lineItems = [{
    service: opp.recommended_service,
    description: opp.description,
    amountCad: amount,
  }];

  await pool.query(
    `insert into quotes (id, case_id, opportunity_id, client_id, title, amount_cad, status, line_items)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [quoteId, opp.case_id || null, opportunityId, opp.client_id || null, `${opp.recommended_service} quote`, amount, "draft", safeJson(lineItems)]
  );

  await pool.query(`update service_opportunities set status = 'quoted', updated_at = now() where id = $1`, [opportunityId]);
  if (opp.case_id) await audit(opp.case_id, "operator", "quote_created", { quoteId, opportunityId, amountCad: amount });

  res.status(201).json({ quoteId, amountCad: amount, lineItems });
}));

app.listen(CONFIG.port, () => {
  console.log(`${CONFIG.product} API running on http://localhost:${CONFIG.port}`);
});
