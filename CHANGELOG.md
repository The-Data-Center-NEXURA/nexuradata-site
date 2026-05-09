# Changelog

All notable user-facing or production-impacting changes to NEXURADATA. Newest on top. One bullet per deploy. Keep it terse — link to commits or PRs for detail.

Format: `## YYYY-MM-DD — short title` then 1–N bullets. Mark breaking changes with **BREAKING:**.

---

## 2026-05-09 — Live status board + CSS source split

- New public endpoint `GET /api/platform-status` returns per-component health for `site`, `intake`, `status`, `payments`, `email`, `database`, and `lab`. Live `select 1` Neon ping for the database card; env-presence checks for secret-bound components; `LAB_STATUS_OVERRIDE` + `LAB_STATUS_DETAIL` env vars let an operator override the lab card. Rate limited 60/min, cached `public, max-age=60, stale-while-revalidate=120`.
- New `assets/js/status-board.js` (CSP-compliant external script) updates FR + EN `statut-services-montreal.html` from the live API. New "Database" card on both pages. Bilingual headlines + last-checked timestamp.
- New `tests/platform-status.test.js` (4 tests). Total suite: 317 passing.
- Split `assets/css/site.css` into 17 ordered partials under `assets/css/src/` (`00-tokens.css` … `16-polish-layer.css`). `assets/css/site.css` is now a generated artifact produced by `scripts/build-css.mjs`, which runs first in `npm run build`. The split was verified byte-identical via SHA-256 (`scripts/split-css-once.mjs`). New `scripts/hooks/css-source-guard.sh` blocks direct edits to the generated file. See `assets/css/src/README.md` for the layout and workflow.
- `scripts/sync-release.mjs` now also copies `merchant-feed-en.xml` to `release-cloudflare/`.

## 2026-05-09 — Polish layer + audits

- Added a CSS POLISH LAYER at the end of `assets/css/site.css` (signature asymmetric corner restored on buttons/cards/pills/fields, calmer transitions, eyebrow caret, focus ring, IBM Plex `ss01/ss02` opentype features). Fully reversible by deleting the marked block.
- Renamed misnamed `--serif` token to `--font-sans-locked`. The old `--serif` is kept as a deprecated alias.
- Updated `design-system.instructions.md` to clarify the motion rule (calm color/border transitions allowed; kinetic hero permitted only when gated by `prefers-reduced-motion`).
- Added `merchant-feed-en.xml` for the English Merchant Center feed.
- Added new `tests/intake.test.js` smoke tests covering the intake function's HTTP-method gating and config-fallback behavior.
- Added `CHANGELOG.md` (this file) and `docs/README.md` index.
- Verified Google indexing surface: 46/46 indexable pages have canonical + hreflang fr/en/x-default + JSON-LD; sitemap.xml is complete; robots.txt correct.
- Added `wrangler-config-guard` PreToolUse hook (asks before any agent edit to `wrangler.jsonc`).

---

## Notes

- The Cloudflare Pages deploy is triggered by `npm run cf:deploy` (or `cf:deploy:staging`). Add an entry here for **every** deploy that changes user-visible behavior, security headers, env var contracts, or data schemas.
- For internal-only doc updates, prefix the bullet with `[docs]` and skip if trivial.
- For dependency bumps without behavior change, prefix with `[deps]`.
