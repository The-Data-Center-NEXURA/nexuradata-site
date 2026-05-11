-- NEXURA RemoteLab + Monitor platform v2 — additive schema.
-- Adds Monitor (preventive monitoring), Opportunity Engine, generated reports,
-- and opportunity-derived quotes. Existing tables (cases, remotefix_*,
-- case_notification_outbox) are NOT modified.
--
-- Reference spec: apps/remotelab-api/src/server.ts (SCHEMA_SQL block).
-- Naming: unprefixed where the entity is genuinely new (clients,
-- monitoring_*, service_opportunities, generated_reports, quotes).
-- The legacy `remotefix_*` triage/session/report tables stay as-is until
-- Phase E rename to `remotelab_*` and a follow-up 0005 drop migration.
--
-- All statements use IF NOT EXISTS so re-running on a seeded branch is safe.

-- ============================================================
-- Clients (denormalized client identity, separate from cases.email)
-- ============================================================

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'individual'
    CHECK (type IN ('individual', 'business', 'reseller')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_clients_type_created ON clients(type, created_at DESC);

-- ============================================================
-- NEXURA Monitor — plans, accounts, agents, assets, checks, alerts
-- ============================================================

CREATE TABLE IF NOT EXISTS monitoring_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_price_cad INTEGER NOT NULL DEFAULT 0,
  max_assets INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitoring_accounts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial', 'active', 'past_due', 'paused', 'cancelled')),
  trial_ends_at TIMESTAMPTZ DEFAULT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES monitoring_plans(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_monitoring_accounts_client
  ON monitoring_accounts(client_id, status);
CREATE INDEX IF NOT EXISTS idx_monitoring_accounts_status
  ON monitoring_accounts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS monitoring_agents (
  id TEXT PRIMARY KEY,
  monitoring_account_id TEXT NOT NULL,
  agent_key_hash TEXT NOT NULL,
  hostname TEXT NOT NULL,
  platform TEXT NOT NULL
    CHECK (platform IN ('windows', 'macos', 'linux', 'nas', 'server')),
  agent_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'offline', 'disabled', 'revoked')),
  last_seen_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (monitoring_account_id) REFERENCES monitoring_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_monitoring_agents_account
  ON monitoring_agents(monitoring_account_id, status);
CREATE INDEX IF NOT EXISTS idx_monitoring_agents_last_seen
  ON monitoring_agents(last_seen_at DESC);

CREATE TABLE IF NOT EXISTS monitored_assets (
  id TEXT PRIMARY KEY,
  monitoring_account_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  asset_type TEXT NOT NULL
    CHECK (asset_type IN ('workstation', 'server', 'nas', 'external_drive', 'cloud_account', 'mailbox')),
  display_name TEXT NOT NULL,
  serial TEXT DEFAULT NULL,
  model TEXT DEFAULT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'healthy'
    CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (monitoring_account_id) REFERENCES monitoring_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES monitoring_agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_monitored_assets_account_status
  ON monitored_assets(monitoring_account_id, status);
CREATE INDEX IF NOT EXISTS idx_monitored_assets_agent
  ON monitored_assets(agent_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS health_checks (
  id TEXT PRIMARY KEY,
  monitoring_account_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  check_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  summary TEXT NOT NULL DEFAULT '',
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (monitoring_account_id) REFERENCES monitoring_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES monitored_assets(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES monitoring_agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_health_checks_asset_created
  ON health_checks(asset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_account_severity
  ON health_checks(monitoring_account_id, severity, created_at DESC);

CREATE TABLE IF NOT EXISTS health_alerts (
  id TEXT PRIMARY KEY,
  monitoring_account_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  source_check_id TEXT NOT NULL,
  severity TEXT NOT NULL
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  recommended_service TEXT NOT NULL DEFAULT '',
  recommended_price_min INTEGER NOT NULL DEFAULT 0,
  recommended_price_max INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'converted_to_case', 'resolved', 'dismissed')),
  created_case_id TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (monitoring_account_id) REFERENCES monitoring_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES monitored_assets(id) ON DELETE CASCADE,
  FOREIGN KEY (source_check_id) REFERENCES health_checks(id) ON DELETE CASCADE,
  FOREIGN KEY (created_case_id) REFERENCES cases(case_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_health_alerts_account_status
  ON health_alerts(monitoring_account_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_alerts_severity_status
  ON health_alerts(severity, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_alerts_case
  ON health_alerts(created_case_id);

-- ============================================================
-- Opportunity Engine
-- ============================================================

CREATE TABLE IF NOT EXISTS service_opportunities (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('triage', 'diagnostic_report', 'monitoring_alert', 'manual')),
  source_id TEXT DEFAULT NULL,
  case_id TEXT DEFAULT NULL,
  monitoring_account_id TEXT DEFAULT NULL,
  client_id TEXT DEFAULT NULL,
  title TEXT NOT NULL,
  recommended_service TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  estimated_value_min INTEGER NOT NULL DEFAULT 0,
  estimated_value_max INTEGER NOT NULL DEFAULT 0,
  probability NUMERIC(4, 3) NOT NULL DEFAULT 0
    CHECK (probability >= 0 AND probability <= 1),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  next_best_action TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'contacted', 'quoted', 'won', 'lost', 'dismissed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE SET NULL,
  FOREIGN KEY (monitoring_account_id) REFERENCES monitoring_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_opportunities_status_priority
  ON service_opportunities(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_case
  ON service_opportunities(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_client
  ON service_opportunities(client_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunities_source
  ON service_opportunities(source_type, source_id);

-- ============================================================
-- Generated reports (markdown bodies; PDF rendered on demand)
-- ============================================================

CREATE TABLE IF NOT EXISTS generated_reports (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  report_type TEXT NOT NULL
    CHECK (report_type IN ('remotelab_diagnostic', 'server_triage', 'ransomware_first_response', 'monthly_monitor_summary')),
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_case_created
  ON generated_reports(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_reports_type
  ON generated_reports(report_type, created_at DESC);

-- ============================================================
-- Opportunity-derived quotes (Stripe integration in Phase H)
-- ============================================================

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  case_id TEXT DEFAULT NULL,
  opportunity_id TEXT DEFAULT NULL,
  client_id TEXT DEFAULT NULL,
  title TEXT NOT NULL,
  amount_cad INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'approved', 'paid', 'declined', 'expired')),
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  stripe_checkout_id TEXT DEFAULT NULL,
  stripe_payment_intent_id TEXT DEFAULT NULL,
  sent_at TIMESTAMPTZ DEFAULT NULL,
  approved_at TIMESTAMPTZ DEFAULT NULL,
  paid_at TIMESTAMPTZ DEFAULT NULL,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE SET NULL,
  FOREIGN KEY (opportunity_id) REFERENCES service_opportunities(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_quotes_status_created
  ON quotes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_opportunity
  ON quotes(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_quotes_case
  ON quotes(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_client
  ON quotes(client_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_stripe_checkout
  ON quotes(stripe_checkout_id) WHERE stripe_checkout_id IS NOT NULL;

-- ============================================================
-- RLS — server-side Cloudflare Functions use service-role only.
-- ============================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Intentionally no public table policies. All access goes through Pages
-- Functions using service-role credentials (functions/_lib/db.js).

-- ============================================================
-- Seed Monitor plans (idempotent upsert).
-- ============================================================

INSERT INTO monitoring_plans (id, name, monthly_price_cad, max_assets, features)
VALUES
  ('plan_basic', 'NEXURA Monitor Basic', 49, 1,
    '["disk_smart","free_space","critical_events"]'::jsonb),
  ('plan_business', 'NEXURA Monitor Business', 199, 10,
    '["disk_smart","free_space","critical_events","backup_status","cloud_sync","monthly_report"]'::jsonb),
  ('plan_server', 'NEXURA Monitor Server', 499, 25,
    '["disk_smart","free_space","critical_events","raid_status","backup_status","snapshot_status","priority_triage","monthly_report"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price_cad = EXCLUDED.monthly_price_cad,
  max_assets = EXCLUDED.max_assets,
  features = EXCLUDED.features,
  updated_at = NOW();
