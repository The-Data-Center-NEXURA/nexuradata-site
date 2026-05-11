-- NEXURA RemoteFix MVP tables.
-- PostgreSQL/Supabase-compatible DDL.

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

-- Supabase RLS baseline. Server-side Cloudflare Functions should use service-role
-- credentials only. Client browser code must use tokenized API routes, not direct
-- table access.
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

-- Intentionally no public table policies for case/session/audit data.
-- Access goes through /api/remotefix/* with hashed temporary session tokens.