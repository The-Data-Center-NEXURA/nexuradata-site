#!/usr/bin/env bash
# google-daily-sync.sh
# SessionStart hook — reminds the operator of outstanding Google platform tasks
# and surfaces the current GA4 Measurement ID so it is never confused or lost.

set -euo pipefail

cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "GOOGLE DAILY SYNC\n\nGA4 Measurement ID: G-TC31YSS01P (wired in all HTML pages + CSP)\n\nPENDING MANUAL TASKS (do these in a browser — code is ready):\n[ ] Search Console — verify nexuradata.ca domain via DNS TXT record, then submit https://nexuradata.ca/sitemap.xml\n[ ] GA4 — confirm account exists at analytics.google.com, property nexuradata.ca, ID G-TC31YSS01P\n[ ] Merchant Center — create account at merchants.google.com, claim site, schedule feed: https://nexuradata.ca/merchant-feed.xml (weekly, Mon 06:00 ET)\n[ ] Business Profile — create at business.google.com, category 'Data recovery service', request verification\n\nCOMPLETED (code side):\n[x] GA4 snippet on every FR + EN page\n[x] CSP allows googletagmanager.com, google-analytics.com, doubleclick.net\n[x] sitemap.xml present at /sitemap.xml\n[x] merchant-feed.xml present at /merchant-feed.xml\n\nSee docs/GOOGLE-SETUP.md for full step-by-step instructions."
  }
}
EOF

exit 0
