---
description: "Generate vitest unit tests for a functions/_lib/ module, following project mock and assertion conventions."
agent: "agent"
argument-hint: "Module name, e.g. 'cases.d1 — D1 query helpers'"
---
Write comprehensive vitest unit tests for the specified `functions/_lib/` module.

Ask for anything not provided: which module, which exported functions to cover, any edge cases to prioritize.

## Conventions (non-negotiable)

- **File location:** `tests/_lib/{{module}}.test.js` — mirrors source path.
- **Explicit imports — no globals:**
  ```js
  import { describe, it, expect, vi, beforeEach } from "vitest";
  ```
- **Relative path to source:** `import { fn } from "../../functions/_lib/{{module}}.js";`
- **`describe` per exported function**, `it` per behaviour.

## Mock everything external

| Dependency | How to mock |
|------------|-------------|
| `fetch` (Resend, any HTTP) | `vi.spyOn(globalThis, "fetch").mockResolvedValue(…)` — restore after each test |
| D1 / Neon DB | `vi.mock("@neondatabase/serverless", () => ({ neon: () => vi.fn().mockResolvedValue([]) }))` at top |
| `env` object | Plain object with test values: `{ RESEND_API_KEY: "re_test", … }` — never real secrets |
| `Request` / `Response` | Use the Web API constructors directly |
| Crypto | Use real Web Crypto API (don't mock) |

Always add `beforeEach(() => { vi.restoreAllMocks(); })` — never rely on per-test manual restore.

## Required test categories

1. **Missing / invalid config** — each required env var missing → graceful error or documented return value.
2. **Happy path** — valid inputs → correct output; verify outgoing HTTP calls (URL, method, headers, body).
3. **Input edge cases** — `null`, `undefined`, empty string, unexpected types.
4. **Uniqueness / format** (if generating IDs or codes) — loop 50 iterations, collect in a `Set`, assert `set.size === 50`; regex-match expected format.
5. **Round-trip** (if crypto) — encrypt then decrypt, compare to original.
6. **Error propagation** — upstream failure (e.g. fetch rejects) → function surfaces a clear error or returns a failure object.

## Reference files

Read these for patterns before writing:

- [tests/_lib/email.test.js](../../tests/_lib/email.test.js) — fetch spy, env mock, Resend assertions
- [tests/_lib/cases.test.js](../../tests/_lib/cases.test.js) — crypto round-trip, uniqueness loops, input normalization
- [tests/_lib/rate-limit.test.js](../../tests/_lib/rate-limit.test.js) — request mock helper, per-IP isolation
- [tests/_lib/stripe.test.js](../../tests/_lib/stripe.test.js) — webhook signature verification, signed request builder

## Output

A single test file at the correct path, ready to pass with `npm test`.
