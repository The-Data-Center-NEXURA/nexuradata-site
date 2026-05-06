# Dependency Policy

NEXURADATA uses a small Node.js dependency surface for the public site, Cloudflare Pages Functions, build scripts, and tests. The goal is to keep dependency changes explicit, reproducible, and easy to review.

## Runtime Baseline

- Node.js is pinned with `.node-version` and `package.json` `engines.node`.
- CI and deploy workflows must use `actions/setup-node` with `node-version-file: .node-version`.
- Upgrade Node one major version at a time, after Cloudflare Pages, Wrangler, Vitest, Sharp, and Neon compatibility are confirmed.

## Install And Lockfile Rules

- Use `npm ci` in CI and deploy jobs.
- Commit `package-lock.json` with every dependency change.
- Do not hand-edit `package-lock.json`; regenerate it with npm.
- Do not commit `node_modules/` or generated package caches.

## Registry And Feed Hygiene

- `.npmrc` pins npm installs to `https://registry.npmjs.org/` and explicitly maps the `@neondatabase` scope to the same public registry.
- Do not add private or mirror registries without documenting the owner, authentication model, and allowed package scopes.
- Keep audit sources and install sources aligned unless there is a documented incident-response reason to separate them.
- Run `npm run audit:signatures` to verify registry signatures and attestations for packages that publish them.

## Automated Updates

- Dependabot checks npm and GitHub Actions weekly.
- Security updates should be reviewed first, then patch/minor updates, then major updates.
- Keep dependency PRs small unless a coordinated major upgrade requires grouped changes.

## Pull Request Gates

- Every pull request to `main` must pass CI: `npm ci`, `npm run secret:scan`, `npm run audit`, `npm run audit:signatures`, `npm run check`, `npm run test:coverage`, and `npm run build`.
- Dependency Review blocks pull requests that introduce moderate-or-higher known vulnerabilities.
- Dependency Review blocks strong copyleft or server-side copyleft licenses unless leadership approves a documented exception.
- Secret Scan checks tracked files and git history without printing matched values.
- CodeQL and njsscan provide static application security scanning and publish findings to GitHub code scanning.

## Branch Protection

Configure `main` in GitHub repository settings with these required checks:

- `Tests + build`
- `Secret scan`
- `Dependency review`
- `Analyze JavaScript`
- `njsscan code scanning`

Also require pull requests before merge, at least one reviewer, conversation resolution, and no force pushes.

## Audit And Triage

- `npm run audit` is the baseline vulnerability gate and fails on moderate or higher advisories.
- CI runs the audit on pull requests and on a weekly schedule so advisories surface even when source code does not change.
- If an advisory cannot be fixed immediately, document the package, affected path, exposure, mitigation, and follow-up date in the PR or issue.

## Review Checklist

- `npm ci`
- `npm run secret:scan`
- `npm run audit`
- `npm run audit:signatures`
- `npm run check`
- `npm run test:coverage`
- `npm run build`

For Cloudflare-facing dependency changes, also confirm that Pages Functions still use ESM and that no secrets are logged or exposed.
