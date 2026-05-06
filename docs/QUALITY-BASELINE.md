# Quality Baseline

This repo is a Node.js and Cloudflare Pages project. Quality gates should stay fast, deterministic, and focused on the public site, Pages Functions, and launch-critical workflows.

The quality baseline supports the repo-wide delivery sequence in [`PLATFORM-HARDENING-TIMELINE.md`](PLATFORM-HARDENING-TIMELINE.md).

## Formatting And Static Rules

- `.editorconfig` is the formatting baseline: UTF-8, LF endings, spaces, final newline, and trailing-whitespace trimming outside Markdown.
- `npm run check` enforces repository-specific quality rules such as bilingual page pairing, public asset hygiene, cache-key freshness, consent-safe analytics wiring, and generated output boundaries.
- `npm run ui:smoke` checks high-impact accessibility and bilingual readiness rules before tests and build output verification.
- CI must run `npm run check` and `npm run ui:smoke` before tests and build output verification.

## Test Baseline

- Test framework: Vitest.
- Unit tests cover shared Function logic in `functions/_lib/`.
- API seam tests cover public endpoints in `functions/api/`.
- Middleware tests cover bot blocking and security header hardening.
- Keep tests deterministic: no live Neon, Stripe, Resend, Cloudflare, or network dependencies in the default test run.

## Test Layers And Gates

| Test layer / gate | Scope | Frequency | Gate recommendation |
| --- | --- | --- | --- |
| Secret scan | Tracked and untracked committable files | Local before commit, every PR, scheduled history scan | Required; fail on findings until rotated or proven inert |
| Dependency audit | npm advisory database and package signatures | Every PR, deploy, weekly schedule | Required; fail on moderate-or-higher advisories or failed signatures |
| Repository quality gate | Bilingual page pairing, generated-output boundaries, CSP hygiene, public asset rules, consent-safe analytics wiring | Local before commit and every PR | Required; fail closed |
| UI smoke | Static HTML accessibility checks and FR/EN localisation readiness | Local before UI/content PRs and every PR | Required for public-site changes; fail closed in CI |
| Unit tests | Pure helper logic under `functions/_lib/` | Local during development and every PR | Required; no external services in default run |
| API seam tests | Pages Function request/response behavior for public endpoints and webhooks | Every PR touching `functions/api/` or shared helpers | Required; use mocked context/env and never live provider calls |
| Middleware tests | Bot blocking, security headers, observability headers and request logging | Every PR touching middleware or `_lib` helpers | Required; assert headers and safe structured log fields |
| Coverage reporting | V8 coverage for `functions/**/*.js` | Every PR and scheduled CI | Required report artifact; thresholds added only after baseline review |
| Build and release sync | `release-cloudflare/` generation from tracked source | Every PR and deploy | Required; generated output must match source after `npm run build` |
| Manual browser smoke | Homepage, language switch, intake form, chatbot, status portal, operations protection | Release candidate and after deployment | Required release checklist; record findings in the launch/runbook issue |
| Production telemetry smoke | Known `x-request-id`, API response headers and Cloudflare log export visibility | After telemetry/export changes and release candidates | Required before relying on logs for incident response |

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

## Accessibility And Localisation

- `npm run ui:smoke` verifies page language attributes, FR/EN page mirrors, image alt coverage, duplicate IDs, form-control accessible names, button names, broken `aria-labelledby` references, positive tabindex values, and autofocus usage.
- Manual release checks should still include keyboard-only navigation through the homepage intake form, chatbot, language switch, status portal, and operations console.
- French remains the source locale; English pages under `en/` must keep the same filename and use translated visible text while preserving backend form values where APIs expect French enum values.

## Release Performance Baseline

Capture performance against the built site, not ad hoc source files:

1. Run `npm run build`.
2. Run `npm run cf:dev` or serve `release-cloudflare/` through the deployment preview.
3. Profile homepage load, diagnostic assistant open/close, intake form validation, and status lookup.
4. Record CPU, memory, main-thread blocking time, console errors, and network failures.
5. Treat new blocking scripts, uncached heavy assets, hydration errors, or user-visible layout shifts as release blockers.

The first numeric thresholds should be based on deployed Cloudflare Pages measurements, not the dev container.
