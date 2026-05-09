# Observability Baseline

NEXURADATA runs on Cloudflare Pages and Pages Functions. Keep observability small: structured JSON logs, correlation headers, and Cloudflare log export.

This supports the operations stage in [`PLATFORM-HARDENING-TIMELINE.md`](PLATFORM-HARDENING-TIMELINE.md).

## Runtime Rules

- Pages Functions use `functions/_lib/observability.js` for request logs and application events.
- API and operations responses expose `x-request-id`, `x-correlation-id`, and `traceparent`.
- Logs include service, environment, version, operation, route, status, duration and outcome.
- Logs must not include request bodies, cookies, authorization headers, access codes, secrets, database URLs or raw environment objects.

## Central Export

Configure export outside source control:

1. Enable Cloudflare Pages / Workers logs for production.
2. Send logs through Cloudflare Logpush, Workers Trace Events or the chosen account integration.
3. Preserve JSON fields at ingestion.
4. Verify with a known `x-request-id` that appears in both response headers and the log destination.

## AI Audit Retention

The concierge route emits structured AI audit events with:

- `event = "api.concierge.openai.audit"`
- phase and result (`skipped`, `primary_completion`, `followup_completion`)
- model/usage metadata when available
- locale, message/image counts and priority flags

To make this audit usable for compliance and incident review:

1. Export runtime logs to a retained destination (R2, SIEM, or analytics warehouse).
2. Keep at least one indexed field for `event` and one for `requestId`.
3. Keep retention and access controls aligned with privacy policy and Loi 25 requirements.
4. Validate the pipeline by triggering `POST /api/concierge` and searching for `api.concierge.openai.audit`.

See `docs/LOG-EXPORT-CLOUDFLARE.md` for the concrete checklist.

## Container Decision

Do not containerise the current production deployment. Cloudflare Pages deploys static output plus Pages Functions, so a container would add maintenance without improving the release path.

Add a Dockerfile only for a future service that actually ships as a long-lived container, queue worker or internal tool.
