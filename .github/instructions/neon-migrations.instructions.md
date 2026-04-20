---
description: "Use when writing Neon Postgres migrations, schema changes, or altering tables. Covers naming, DDL patterns, and migration workflow."
applyTo: "migrations/neon/**/*.sql"
---
# Neon Postgres Migrations

The active schema lives in `migrations/neon/`. Older `migrations/d1-archive/` files are
kept for historical reference only and must not be modified.

## Naming

Sequential four-digit prefix with a snake_case description:

```
0001_full_schema.sql
0002_your_change.sql
```

## DDL Patterns

- Use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` for new objects.
- Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for schema expansion.
- Provide explicit defaults for new `NOT NULL` columns when adding to existing tables.
- Prefer `TIMESTAMPTZ` for new event timestamps (legacy `TEXT` columns remain for back-compat).
- Use `INTEGER` for monetary cents and boolean flags (0/1) to keep parity with the existing schema.
- Use `SERIAL PRIMARY KEY` for autoincrement IDs.

## Conventions

- Foreign keys reference `case_id TEXT` (the application-generated ID, e.g. `NX-20260415-A1B2C3D4`), not the autoincrement `id`.
- Always add relevant indexes — the console uses `ORDER BY updated_at DESC` and filters by `status`, `case_id`.
- Index naming: `idx_{table}_{columns}`.
- Use partial unique indexes (`WHERE col <> ''`) to allow empty placeholders while still enforcing uniqueness on real values.

## Workflow

```bash
# Apply against a Neon branch or local Postgres
psql "$DATABASE_URL" -f migrations/neon/0001_full_schema.sql
```

Always test against a Neon branch before applying to production.
