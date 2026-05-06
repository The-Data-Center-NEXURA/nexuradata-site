# Quality Baseline

This repo is a Node.js and Cloudflare Pages project. Quality gates should stay fast, deterministic, and focused on the public site, Pages Functions, and launch-critical workflows.

## Formatting And Static Rules

- `.editorconfig` is the formatting baseline: UTF-8, LF endings, spaces, final newline, and trailing-whitespace trimming outside Markdown.
- `npm run check` enforces repository-specific quality rules such as bilingual page pairing, public asset hygiene, cache-key freshness, consent-safe analytics wiring, and generated output boundaries.
- CI must run `npm run check` before tests and build output verification.

## Test Baseline

- Test framework: Vitest.
- Unit tests cover shared Function logic in `functions/_lib/`.
- API seam tests cover public endpoints in `functions/api/`.
- Middleware tests cover bot blocking and security header hardening.
- Keep tests deterministic: no live Neon, Stripe, Resend, Cloudflare, or network dependencies in the default test run.

## Coverage Reporting

- `npm run test:coverage` runs the Vitest suite with V8 coverage.
- Coverage is scoped to `functions/**/*.js` for the first baseline because this is the highest-risk server-side surface.
- CI uploads `coverage/lcov.info` and the HTML coverage entry point as an artifact.
- Do not add percentage thresholds until the baseline is reviewed; prefer raising coverage on critical paths over chasing broad vanity coverage.

## Thin Smoke Suite

For release candidates, run this manual browser smoke set after `npm run cf:dev`:

- Homepage loads in French and the language switch opens `/en/`.
- Diagnostic assistant opens, produces a result, and closes with Escape.
- Intake form rejects missing required fields and can fall back safely when APIs are unavailable.
- Client status page shows the demo/empty state without exposing private data.
- Operations pages remain behind Cloudflare Access in deployed environments.

## Release Performance Baseline

Capture performance against the built site, not ad hoc source files:

1. Run `npm run build`.
2. Run `npm run cf:dev` or serve `release-cloudflare/` through the deployment preview.
3. Profile homepage load, diagnostic assistant open/close, intake form validation, and status lookup.
4. Record CPU, memory, main-thread blocking time, console errors, and network failures.
5. Treat new blocking scripts, uncached heavy assets, hydration errors, or user-visible layout shifts as release blockers.

The first numeric thresholds should be based on deployed Cloudflare Pages measurements, not the dev container.
