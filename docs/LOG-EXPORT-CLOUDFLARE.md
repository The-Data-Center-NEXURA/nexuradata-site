# Cloudflare Log Export For AI Audit

This guide ensures that AI audit events from `POST /api/concierge` are retained and searchable outside runtime stdout.

## Target Event

Your application emits structured events with:

- `event: "api.concierge.openai.audit"`
- `requestId`, `correlationId`, `traceId`, `route`, `operation`
- `phase`, `result`, `reason`, `durationMs`
- `model`, `usageIn`, `usageOut`, `usageTotal` (when available)

## Recommended Destination

Pick one central destination and keep it long-term:

1. Cloudflare R2 bucket (simple archive + downstream processing)
2. SIEM / observability platform (search + alerts)
3. Analytics warehouse (BigQuery/Snowflake/etc.)

## Setup Checklist (Dashboard)

1. Open Cloudflare dashboard for the production account.
2. Go to Logs / Logpush (or the account log export area used by your plan).
3. Create an export job for production traffic/runtime logs.
4. Select destination (R2/S3-compatible/SIEM endpoint).
5. Keep JSON fields unchanged during ingestion.
6. Include/index at minimum:
   - `event`
   - `requestId`
   - `route`
   - `timestamp`
7. Save and enable the job.

## Verification (Required)

1. Trigger one production AI request:

```bash
curl -sS -X POST https://www.nexuradata.ca/api/concierge \
  -H 'content-type: application/json' \
  --data '{"locale":"fr","messages":[{"role":"user","content":"Mon disque ne monte plus"}]}'
```

2. In your log destination, search for:

- `event = "api.concierge.openai.audit"`
- `route = "/api/concierge"`

3. Confirm at least one event exists for the request and includes:

- phase/result fields
- request identifiers (`requestId`, `correlationId`)

## Operational Guardrails

1. Do not export raw request bodies for AI prompts.
2. Keep retention/access policies aligned with your privacy commitments and Loi 25 obligations.
3. Restrict log access to authorized operators only.
4. Review export health after each infra change or deploy affecting logging.

## Incident Shortcut

If audit events are missing:

1. Verify export job status is enabled.
2. Confirm destination credentials/path are valid.
3. Trigger a fresh concierge request.
4. Validate app logs still emit `api.concierge.openai.audit` locally.
5. Recreate the export job if field mapping/transformation is dropping `event`.
