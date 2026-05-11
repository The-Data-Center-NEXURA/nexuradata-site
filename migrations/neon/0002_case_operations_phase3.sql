-- Phase 3 operational fields and notification outbox.
-- PostgreSQL/Supabase-compatible DDL.

ALTER TABLE cases ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS preferred_contact TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS symptom TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_type TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS indicative_price TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS assigned_to TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS last_action TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS next_action TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS documents_summary TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS estimated_timeline TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS quote_number TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS diagnostic_summary TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS recovery_probability TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS quote_conditions TEXT NOT NULL DEFAULT '';

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