# Security Policy

NEXURADATA handles data-recovery and digital-forensics requests. Security reports are treated seriously and should be sent through a private channel, never opened as public issues.

## Supported scope

Security reports are accepted for:

- the public NEXURADATA website;
- Cloudflare Pages Functions under `functions/`;
- the client case-tracking flow;
- the operator console and protected API routes;
- repository workflows, deployment configuration and dependency risk.

The supported branch is `main`.

## How to report a vulnerability

Send a private report to:

```text
contact@nexuradata.ca
```

Use this subject line:

```text
[SECURITY] NEXURADATA vulnerability report
```

For privacy or personal-information concerns, use:

```text
privacy@nexuradata.ca
```

Include, when possible:

- affected URL, endpoint, workflow or file;
- clear reproduction steps;
- expected impact;
- screenshots or logs with secrets and personal data removed;
- whether the issue may expose client data, access codes, payment data or operational systems.

Do not include real client data, access codes, credentials, API keys or private documents in a report.

## Response targets

- Initial acknowledgement: 2 business days.
- Initial assessment: 5 business days.
- Fix timeline: based on severity, exploitability and operational risk.

High-risk reports involving credentials, client data, access-code bypass, payment flow, operator routes or deployment secrets are prioritized.

## Safe harbor

Good-faith reports are welcome when they avoid service disruption, data exfiltration, social engineering, spam, destructive testing and public disclosure before a fix or mitigation is available.

## Out of scope

- volumetric denial-of-service testing;
- phishing or social-engineering attempts;
- physical attacks;
- reports based only on automated scanner output without practical impact;
- issues requiring compromised third-party accounts or devices.