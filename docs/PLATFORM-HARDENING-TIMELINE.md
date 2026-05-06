# Platform Hardening Timeline

This adapts the original enterprise hardening plan to NEXURADATA's actual stack: Node.js, npm, Cloudflare Pages, Pages Functions, GitHub Actions, Neon, Stripe and Resend.

```mermaid
gantt
  title NEXURADATA platform hardening timeline
  dateFormat  YYYY-MM-DD
  axisFormat  %d %b
  section Foundation
  Inventory platform risks and launch seams       :a1, 2026-05-07, 3d
  Pin Node runtime and shared npm defaults        :a2, after a1, 4d
  section Dependencies and security
  Harden npm governance and runtime support       :b1, after a2, 6d
  Lockfile audit, signatures, and registry hygiene:b2, after b1, 4d
  Secrets scanning and Cloudflare secret model    :b3, after b2, 4d
  section Quality and delivery
  CI gates and GitHub branch protections          :c1, after a2, 4d
  Repo checks, UI smoke, tests, and coverage      :c2, after c1, 8d
  Structured logging and profiling baseline       :c3, after c2, 5d
  section Conditional readiness
  Accessibility, localisation, optional services  :d1, after c3, 6d
```

## Phase Checklist

| Phase | Done when |
| --- | --- |
| Discovery | We can answer what is running and shipping: public pages, Functions, operations console, CI/deploy workflows, secrets and release output. |
| Foundation | Node, npm scripts, CI and fresh clones use the same runtime and build defaults. |
| Dependencies | `package-lock.json`, `.npmrc`, Dependabot, audit, signatures and Dependency Review keep packages reproducible and reviewable. |
| Review gates | PRs require machine checks and human review before protected branches receive code. |
| Quality | `.editorconfig`, `npm run check`, `npm run ui:smoke`, Vitest and coverage make quality visible. |
| Security | Source has placeholders only, secrets live in GitHub/Cloudflare/provider storage, and scans cover local source plus history. |
| Operations | API and ops requests produce safe structured logs with request IDs, correlation IDs and trace context. |
| Conditional readiness | Containers are added only for future services that deploy as containers; accessibility/localisation checks stay active for public UI. |

## Translation Notes

- .NET `Directory.Build.*` and `global.json` map to npm scripts, `.editorconfig`, `.node-version` and CI `setup-node`.
- NuGet central management and source mapping map to `package-lock.json`, `.npmrc`, Dependabot, Dependency Review, `npm audit` and `npm audit signatures`.
- Runtime retargeting maps to the Node 22 pin and controlled major-version upgrades.
- Vault-backed secrets map to Cloudflare Pages secrets plus GitHub environment secrets for deployment.

Provider settings still matter: enable GitHub branch protection, GitHub secret scanning/push protection, production environment approval, least-privilege Cloudflare deployment tokens and central Cloudflare log export.
