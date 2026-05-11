-- PostgreSQL schema for NEXURADATA (Neon)
-- Consolidated from D1 migrations 0001–0003

CREATE TABLE IF NOT EXISTS cases (
  id SERIAL PRIMARY KEY,
  case_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  preferred_contact TEXT NOT NULL DEFAULT '',
  support TEXT NOT NULL,
  symptom TEXT NOT NULL DEFAULT '',
  urgency TEXT NOT NULL,
  client_type TEXT NOT NULL DEFAULT '',
  indicative_price TEXT NOT NULL DEFAULT '',
  received_at TIMESTAMPTZ DEFAULT NULL,
  assigned_to TEXT NOT NULL DEFAULT '',
  last_action TEXT NOT NULL DEFAULT '',
  next_action TEXT NOT NULL DEFAULT '',
  documents_summary TEXT NOT NULL DEFAULT '',
  estimated_timeline TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  source_path TEXT NOT NULL DEFAULT '/',
  status TEXT NOT NULL,
  next_step TEXT NOT NULL,
  client_summary TEXT NOT NULL,
  access_code_hash TEXT NOT NULL,
  access_code_ciphertext TEXT NOT NULL DEFAULT '',
  access_code_last_sent_at TEXT NOT NULL DEFAULT '',
  status_email_last_sent_at TEXT NOT NULL DEFAULT '',
  qualification_summary TEXT NOT NULL DEFAULT '',
  internal_notes TEXT NOT NULL DEFAULT '',
  handling_flags TEXT NOT NULL DEFAULT '',
  quote_status TEXT NOT NULL DEFAULT 'none',
  quote_amount_cents INTEGER DEFAULT NULL,
  quote_sent_at TEXT NOT NULL DEFAULT '',
  quote_approved_at TEXT NOT NULL DEFAULT '',
  quote_number TEXT NOT NULL DEFAULT '',
  diagnostic_summary TEXT NOT NULL DEFAULT '',
  recovery_probability TEXT NOT NULL DEFAULT '',
  quote_conditions TEXT NOT NULL DEFAULT '',
  preapproval_confirmed INTEGER NOT NULL DEFAULT 0,
  acquisition_source TEXT NOT NULL DEFAULT '',
  last_reminder_sent_at TEXT NOT NULL DEFAULT '',
  last_client_contact_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_cases_updated_at ON cases(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_email ON cases(email);
CREATE INDEX IF NOT EXISTS idx_cases_name ON cases(name);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_quote_status ON cases(quote_status);
CREATE INDEX IF NOT EXISTS idx_cases_received_at ON cases(received_at DESC);

CREATE TABLE IF NOT EXISTS case_notification_outbox (
  id SERIAL PRIMARY KEY,
  notification_id TEXT NOT NULL UNIQUE,
  case_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  status_trigger TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT '',
  provider_message_id TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ DEFAULT NULL,
  created_by TEXT NOT NULL DEFAULT 'system',
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_notification_outbox_case_created
  ON case_notification_outbox(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_notification_outbox_state
  ON case_notification_outbox(state, created_at DESC);

CREATE TABLE IF NOT EXISTS case_updates (
  id SERIAL PRIMARY KEY,
  case_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'timeline',
  title TEXT NOT NULL,
  note TEXT NOT NULL,
  state TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'system',
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_updates_case_visible_sort
  ON case_updates(case_id, kind, is_visible, sort_order);
CREATE INDEX IF NOT EXISTS idx_case_updates_case_created
  ON case_updates(case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS case_payments (
  id SERIAL PRIMARY KEY,
  payment_request_id TEXT NOT NULL UNIQUE,
  case_id TEXT NOT NULL,
  payment_kind TEXT NOT NULL,
  status TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'cad',
  checkout_url TEXT NOT NULL DEFAULT '',
  stripe_checkout_session_id TEXT NOT NULL DEFAULT '',
  stripe_payment_intent_id TEXT NOT NULL DEFAULT '',
  stripe_session_status TEXT NOT NULL DEFAULT '',
  stripe_payment_status TEXT NOT NULL DEFAULT '',
  stripe_customer_email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TEXT NOT NULL DEFAULT '',
  paid_at TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'ops',
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_payments_case_created
  ON case_payments(case_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_payments_session
  ON case_payments(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id <> '';

CREATE TABLE IF NOT EXISTS remotefix_triage_results (
  id SERIAL PRIMARY KEY,
  case_id TEXT NOT NULL,
  matched_rule TEXT NOT NULL,
  service TEXT NOT NULL,
  final_decision TEXT NOT NULL DEFAULT 'REMOTE_DIAGNOSTIC_ONLY',
  issue_type TEXT NOT NULL DEFAULT '',
  media_unstable BOOLEAN NOT NULL DEFAULT FALSE,
  remote_write_risk BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_fix BOOLEAN NOT NULL DEFAULT FALSE,
  legal_or_critical BOOLEAN NOT NULL DEFAULT FALSE,
  monetization_path TEXT NOT NULL DEFAULT '',
  remote_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  auto_repair_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  requires_lab BOOLEAN NOT NULL DEFAULT FALSE,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_label TEXT NOT NULL,
  price_min_cents INTEGER NOT NULL DEFAULT 0,
  price_max_cents INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  next_action TEXT NOT NULL,
  allowed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocked_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_remotefix_triage_case_created
  ON remotefix_triage_results(case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS remotefix_sessions (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  public_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('waiting_for_consent', 'consent_given', 'expired', 'revoked', 'completed')),
  allowed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_remotefix_sessions_case_id
  ON remotefix_sessions(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_remotefix_sessions_status_expires
  ON remotefix_sessions(status, expires_at);

CREATE TABLE IF NOT EXISTS remotefix_consents (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  client_email TEXT NOT NULL,
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  accepted_terms_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES remotefix_sessions(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_remotefix_consents_session_once
  ON remotefix_consents(session_id);
CREATE INDEX IF NOT EXISTS idx_remotefix_consents_case_id
  ON remotefix_consents(case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS remotefix_diagnostic_reports (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  summary TEXT NOT NULL,
  recommended_next_status TEXT NOT NULL,
  safe_actions_to_offer JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocked_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES remotefix_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_remotefix_reports_case_created
  ON remotefix_diagnostic_reports(case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS remotefix_agent_commands (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'claimed', 'running', 'succeeded', 'failed', 'blocked', 'expired')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  server_signature TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'system',
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES remotefix_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_remotefix_agent_commands_session_status
  ON remotefix_agent_commands(session_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_remotefix_agent_commands_case_created
  ON remotefix_agent_commands(case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS remotefix_agent_command_results (
  id TEXT PRIMARY KEY,
  command_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'blocked')),
  stdout TEXT NOT NULL DEFAULT '',
  stderr TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (command_id) REFERENCES remotefix_agent_commands(id) ON DELETE CASCADE,
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_remotefix_command_results_case_created
  ON remotefix_agent_command_results(case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS remotefix_email_logs (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  provider_message_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_remotefix_email_logs_case_created
  ON remotefix_email_logs(case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS remotefix_audit_logs (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  event TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_remotefix_audit_logs_case_created
  ON remotefix_audit_logs(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_remotefix_audit_logs_event
  ON remotefix_audit_logs(event, created_at DESC);

CREATE TABLE IF NOT EXISTS remotefix_idempotency_keys (
  key TEXT PRIMARY KEY,
  route TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_body JSONB,
  status_code INTEGER NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remotefix_idempotency_route
  ON remotefix_idempotency_keys(route, created_at DESC);

CREATE TABLE IF NOT EXISTS remotefix_staff_profiles (
  user_id UUID PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'technician', 'support', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE remotefix_triage_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE remotefix_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE remotefix_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE remotefix_diagnostic_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE remotefix_agent_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE remotefix_agent_command_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE remotefix_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE remotefix_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE remotefix_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE remotefix_staff_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'remotefix_staff_profiles'
      AND policyname = 'staff can read own remotefix profile'
  ) THEN
    CREATE POLICY "staff can read own remotefix profile"
      ON remotefix_staff_profiles FOR SELECT
      USING (user_id::text = current_setting('request.jwt.claim.sub', true));
  END IF;
END $$;
