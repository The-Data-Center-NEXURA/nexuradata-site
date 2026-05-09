# NEXURADATA documentation index

One-line summary of every doc in this folder. Read these before changing anything cross-cutting.

## Architecture & operations

| File | What it covers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | High-level system diagram: Cloudflare Pages + Functions, Neon, Stripe, Resend. Read this first. |
| [PIPELINE-STATUS.md](PIPELINE-STATUS.md) | Current state of each background pipeline (cases, notifications, payments). |
| [PLATFORM-HARDENING-TIMELINE.md](PLATFORM-HARDENING-TIMELINE.md) | Phased plan for security and reliability improvements with target dates. |
| [OBSERVABILITY-BASELINE.md](OBSERVABILITY-BASELINE.md) | What is logged, what is metricized, what is not. |
| [DEPENDENCY-POLICY.md](DEPENDENCY-POLICY.md) | When and how to add or upgrade an npm dependency. |
| [QUALITY-BASELINE.md](QUALITY-BASELINE.md) | Lint, test, build expectations and CI gates. |
| [SECRETS-GOVERNANCE.md](SECRETS-GOVERNANCE.md) | Where secrets live (Cloudflare Pages env), rotation policy. |

## Launch & deploy

| File | What it covers |
| --- | --- |
| [LAUNCH-RUNBOOK.md](LAUNCH-RUNBOOK.md) | Step-by-step: Neon, email, Stripe, Cloudflare Access. The canonical pre-launch checklist. |
| [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md) | Pre-launch content items (copy, photos, legal text). |
| [DEPLOY-FAST.md](DEPLOY-FAST.md) | Quick deployment cheatsheet for routine changes. |

## Marketing & accounts

| File | What it covers |
| --- | --- |
| [MARKETING-ACCOUNT-STATUS.md](MARKETING-ACCOUNT-STATUS.md) | Current state of each marketing channel (Google, Meta, WhatsApp). |
| [GOOGLE-SETUP.md](GOOGLE-SETUP.md) | GA4, Search Console, Merchant Center, Business Profile setup. |
| [FACEBOOK-META-SETUP.md](FACEBOOK-META-SETUP.md) | Meta Business Suite, Page, Pixel setup. |
| [FACEBOOK-CONTENT-CALENDAR-2026-05.md](FACEBOOK-CONTENT-CALENDAR-2026-05.md) | Monthly content plan for the Facebook Page. |
| [WHATSAPP-BUSINESS-SETUP.md](WHATSAPP-BUSINESS-SETUP.md) | WhatsApp Business profile, automated greetings, link routing. |
| [WHATSAPP-QUICK-REPLIES-2026-05.md](WHATSAPP-QUICK-REPLIES-2026-05.md) | Approved canned replies for the lab WhatsApp account. |

## Strategy & research

| File | What it covers |
| --- | --- |
| [PRICING-RESEARCH-2026-04-04.md](PRICING-RESEARCH-2026-04-04.md) | Competitive pricing snapshot (Montréal market, April 2026). |
| [COMPETITOR-RESEARCH.md](COMPETITOR-RESEARCH.md) | Profiles of direct competitors and positioning notes. |
| [REMOTELAB-PRODUCT-BRIEF.md](REMOTELAB-PRODUCT-BRIEF.md) | Product brief for the in-progress NEXURA RemoteLab platform. |
| [AI-AUTOMATION-BLUEPRINT.md](AI-AUTOMATION-BLUEPRINT.md) | Plan for internal AI/agent assistance to operations. |

## Brand & email

| File | What it covers |
| --- | --- |
| [branding-read-only.txt](branding-read-only.txt) | Locked brand identity (logo, palette, typography). **Do not alter.** |
| [email-signature.html](email-signature.html) | Reusable email signature (with `.png`, `.jpg` previews in this folder). |

---

If you add a new doc to this folder, add a line here in the same format. If a doc becomes obsolete, move it to `docs/_archive/` (create the folder if missing) instead of deleting, so external links stop responding to existing references.
