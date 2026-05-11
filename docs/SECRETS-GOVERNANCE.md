# Secrets Governance

NEXURADATA runs on Cloudflare Pages and Pages Functions. Source control must contain only public configuration, placeholders, or references to managed secret stores.

## Storage Model

- Runtime secrets live in Cloudflare Pages environment variables or secrets: `DATABASE_URL`, `RESEND_API_KEY`, `ACCESS_CODE_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and operator allowlists when they are sensitive.
- Deployment credentials live in GitHub Actions environment secrets scoped to `production`: `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
- Provider secrets stay in their system of record: Neon, Stripe, Resend, Cloudflare, and GitHub. Do not copy them into `wrangler.jsonc`, docs, tests, screenshots, tickets, or chat exports.
- Local development secrets may be loaded from shell environment variables or an ignored `.dev.vars` file. Delete local files when the session is done, and never paste their contents into logs.

If the platform later moves to Azure-hosted workloads, Azure Key Vault can become the runtime vault. Until then, Cloudflare Pages secrets are the production runtime vault for this site.

## Rotation Rules

- Rotate any credential that appears in git history, CI logs, issue comments, screenshots, or support messages.
- Rotate Cloudflare deployment tokens at least quarterly and after any maintainer access change.
- Rotate Stripe, Resend, Neon, and access-code secrets after incident response, vendor account changes, or role changes for anyone with production access.
- Use least privilege: Cloudflare deployment tokens should only deploy the NEXURADATA Pages project, not administer the whole account.

## Scanning And Alerts

- `npm run secret:scan` scans tracked and untracked committable source for high-signal credential patterns without printing matched values.
- `npm run secret:scan:history` scans tracked and untracked committable source plus git history objects. The dedicated GitHub workflow runs this on PRs, pushes to `main`, weekly schedule, and manual dispatch.
- GitHub repository secret scanning and push protection should be enabled in repository settings. Alert owner: repository administrator. Rotation SLA: same business day for live credentials, next business day for test-only credentials.
- Treat scanner findings as real until the owning provider confirms the credential is invalid or rotated.

## Local Cleanup Checklist

Before handing off a workstation or sharing a workspace archive:

- Remove `.dev.vars`, `.env`, `.env.*`, downloaded CSV exports, database dumps, and temporary webhook payloads.
- Clear terminal scrollback or command history that contains secrets.
- Confirm `git status --ignored --short` does not show sensitive files staged or force-added.
- Run `npm run secret:scan` before committing.

## CI/CD Identity Controls

- CI workflows run with `contents: read` unless code scanning upload requires `security-events: write`.
- Production deploys use the `production` GitHub Environment and should require reviewer approval in repository settings.
- Keep deployment tokens separate by environment. Do not reuse production deployment credentials for previews or local scripts.
- Review privileged GitHub, Cloudflare, Stripe, Neon, and Resend account access at least monthly during launch, then quarterly.
