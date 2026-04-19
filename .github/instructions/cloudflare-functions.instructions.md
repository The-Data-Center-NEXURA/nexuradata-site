---
description: "Use when writing or editing Cloudflare Pages Functions. Covers ESM exports, _lib reuse, input normalization, error handling, auth, and secret access. Triggers on: API endpoint, function, worker, Neon query, webhook."
applyTo: "functions/**/*.js"
---
# Cloudflare Pages Functions

## Handler Pattern

Export named ESM handlers — not default exports:

```js
export const onRequestOptions = () => onOptions("POST, OPTIONS");

export const onRequestPost = async (context) => {
  // context.env     → env vars and secrets (DATABASE_URL, RESEND_API_KEY, etc.)
  // context.request → standard Request object
};
```

Handler names: `onRequestGet`, `onRequestPost`, `onRequestPut`, `onRequestDelete`, `onRequestOptions`.

## Shared Libraries

Import from `functions/_lib/` — never duplicate logic between endpoints.

| Module | Exports |
|--------|---------|
| `http.js` | `json()`, `onOptions()`, `parsePayload()`, `methodNotAllowed()`, `authorizeOrReject()` |
| `cases.js` | `normalizeText()`, `normalizeMultilineText()`, `validateSubmission()`, case CRUD, access code crypto |
| `email.js` | `sendClientAccessEmail()`, `sendClientStatusEmail()`, `sendLabNotificationEmail()`, `sendClientPaymentLinkEmail()` |
| `stripe.js` | `createHostedCheckoutSession()`, `verifyStripeWebhook()` |
| `rate-limit.js` | `checkRateLimit()` — per-isolate sliding window; layer Cloudflare WAF for production |

## Input → Normalize → Validate → Respond

```js
const payload = await parsePayload(context.request);          // JSON + form data
const name = normalizeText(payload.name, 120);                // trim + collapse whitespace
// validate enum inputs against allow-list Sets
return json({ ok: true, caseId }, { status: 200 });           // always use json() helper
return json({ ok: false, message: "..." }, { status: 400 });
```

Wrap every handler body in try/catch — return user-safe messages, never leak internals.

## Auth & Secrets

- Protected ops endpoints (`functions/api/ops/`): use `authorizeOrReject(request, env, authorizeOpsRequest)` from `_lib/http.js` — returns a 403 Response or auth result.
- Access secrets via `context.env.SECRET_NAME`. Never log, hardcode, or return them.
- Check the database before querying: `if (!context.env?.DATABASE_URL)` → return 503. Use `getDb(env)` from `_lib/cases.js` to obtain a Neon client.
- Neon: tagged-template parameterization only (`` db`SELECT ... WHERE id = ${id}` ``) — never interpolate user input into SQL strings.
- Validate enum inputs against allow-list `Set` objects (e.g., `allowedSupports.has(value)`).

## Rate Limiting

Public endpoints (`intake.js`, `status.js`) must call `checkRateLimit(request, maxPerMinute)` before processing. The limiter is per-isolate (not global) — layer Cloudflare WAF rules for production-grade protection.

## Email Safety

Use `escapeHtml()` from `_lib/email.js` for any user-controlled content in HTML email templates. Include a Resend `Idempotency-Key` header to prevent duplicate sends.
