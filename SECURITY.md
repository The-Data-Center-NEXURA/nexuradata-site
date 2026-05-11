# Security Policy

## Scope

This policy applies to the NEXURADATA website and operational platform hosted at `nexuradata.ca`.

In scope:

- Public intake form (`/api/intake`)
- Public guided diagnostic assistant and server-side case prequalification (`/api/diagnostic`)
- Case status lookup (`/api/status`)
- Stripe webhook handler (`/api/stripe-webhook`)
- Operator console, concierge automation and operator actions (`/operations/`, `/api/ops/*`)
- Cloudflare Pages configuration (`_headers`, `_redirects`)

Out of scope:

- Third-party services (Stripe, Resend, Neon, Cloudflare)
- Social engineering or phishing
- Physical infrastructure

## Authorized Testing Rules

Security testing must be limited to assets owned by NEXURADATA and must not disrupt service or access data belonging to other clients.

Allowed:

- Non-destructive validation of public pages and public APIs
- Authentication and authorization bypass testing on your own test data only
- Responsible proof-of-concept requests with minimal traffic
- Reports about exposed secrets, unsafe headers, dependency risk, XSS, CSRF, access control, rate-limit or webhook validation issues

Not allowed:

- Denial-of-service, stress, spam or brute-force testing
- Social engineering, phishing or physical access attempts
- Exfiltration, deletion, alteration or publication of client data
- Testing third-party platforms directly, including Stripe, Resend, Neon or Cloudflare
- Attempts to bypass Cloudflare Access for `/operations/` or `/api/ops/*` beyond a minimal proof of concept

## Security Controls

The platform uses layered controls that should remain active for every change:

- Cloudflare Access protects operator routes (`/operations/*`, `/api/ops/*`).
- `ACCESS_CODE_SECRET` protects client status access codes; codes must never be logged in plaintext.
- Stripe webhooks must validate signatures before processing events.
- Production Stripe must run with `STRIPE_MODE=live`; test keys or test webhook events are rejected before payment records are created or processed.
- `DATABASE_URL`, `RESEND_API_KEY`, `ACCESS_CODE_SECRET`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are runtime secrets only and must not be committed.
- Public intake, status and operator APIs should reuse shared helpers in `functions/_lib/` for parsing, JSON responses, auth, rate limiting and error handling.
- Automation outputs are advisory and auditable; they must not bypass human review for physical recovery, forensic conclusions, payments or authorization.

Repository gates include:

- `npm run secret:scan` for tracked source files
- `npm run secret:scan:history` for scheduled or manual repository-history scans
- `npm run check` for repo hygiene, forbidden artifacts and required security/quality conventions
- `npm run ui:smoke` for public UI, accessibility and bilingual readiness smoke checks
- `npm run test:coverage` for unit coverage
- `npm run audit` and `npm run audit:signatures` for dependency risk and package signature checks
- CodeQL, dependency review and njsscan SARIF in GitHub Actions

## Secret Handling

Do not include secrets, access codes, customer data, payment identifiers, local file paths or personal addresses in issues, commits, logs or vulnerability reports. If a secret is suspected to be exposed, report it privately and rotate it before sharing details more broadly.

## Reporting a Vulnerability

Please report security vulnerabilities **privately** by email:

**<privacy@nexuradata.ca>**

Include:

1. A clear description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Your contact information (optional)

Do **not** open a public GitHub issue for security vulnerabilities.

## Response Commitment

| Timeline | Action |
| --- | --- |
| Within 48 h | Acknowledgment of your report |
| Within 7 days | Initial assessment and severity classification |
| Within 30 days | Resolution or documented remediation plan |

We will not pursue legal action against researchers who report vulnerabilities in good faith and follow responsible disclosure.
