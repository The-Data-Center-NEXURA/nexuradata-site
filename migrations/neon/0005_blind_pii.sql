-- 0005_blind_pii.sql — additive PII envelope columns.
--
-- Adds encrypted-at-rest companions and deterministic blind indexes for
-- equality lookups on every PII field that today lives in plaintext.
-- Existing plaintext columns are LEFT IN PLACE so the application keeps
-- working unchanged. Cutover is a two-step process:
--
--   1. (this migration) Add new columns + indexes. Deploy.
--   2. Run scripts/backfill-blind-pii.mjs to populate them.
--   3. Patch _lib/cases.js, _lib/remotefix.js, _lib/clients.js to write
--      and read the encrypted columns, falling back to plaintext until
--      backfill is 100%.
--   4. Verify in production for one full quote/case lifecycle.
--   5. Future migration 0006_drop_pii_plaintext.sql DROPS the old
--      columns and the indexes that referenced them.
--
-- All values are stored as TEXT:
--   *_enc   — `v1:<base64(iv|ciphertext|tag)>` produced by encryptField()
--             in functions/_lib/neon-blinder.js. AES-256-GCM, 12-byte IV,
--             16-byte auth tag. Non-deterministic.
--   *_blind — 32 hex chars produced by blindIndex(): HMAC-SHA256 truncated
--             to 16 bytes over the lowercased+trimmed plaintext. Used for
--             equality lookups (`WHERE email_blind = $1`).
--
-- All operations are idempotent: re-running on a partially-applied branch
-- is safe.

-- ────────────────────────────────────────────────────────────
-- cases — client identity
-- ────────────────────────────────────────────────────────────

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS email_enc   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_blind TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_enc   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_blind TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS name_enc    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS name_blind  TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_cases_email_blind ON cases(email_blind)
  WHERE email_blind <> '';
CREATE INDEX IF NOT EXISTS idx_cases_phone_blind ON cases(phone_blind)
  WHERE phone_blind <> '';
CREATE INDEX IF NOT EXISTS idx_cases_name_blind  ON cases(name_blind)
  WHERE name_blind  <> '';

-- ────────────────────────────────────────────────────────────
-- clients (RemoteLab v2 — denormalized client identity)
-- ────────────────────────────────────────────────────────────

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS email_enc   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_blind TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_enc   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_blind TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS name_enc    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS name_blind  TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_clients_email_blind ON clients(email_blind)
  WHERE email_blind <> '';
CREATE INDEX IF NOT EXISTS idx_clients_phone_blind ON clients(phone_blind)
  WHERE phone_blind <> '';

-- ────────────────────────────────────────────────────────────
-- remotefix_consents — consent receipts (legal evidence; PII = email)
-- ────────────────────────────────────────────────────────────

ALTER TABLE remotefix_consents
  ADD COLUMN IF NOT EXISTS client_email_enc   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_email_blind TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_remotefix_consents_email_blind
  ON remotefix_consents(client_email_blind)
  WHERE client_email_blind <> '';
