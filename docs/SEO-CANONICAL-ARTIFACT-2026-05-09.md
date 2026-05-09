# SEO Canonical Artifact — 2026-05-09

## Objective
Align canonical signals to a single host and remove apex/www ambiguity for crawlers and social scrapers.

## Canonical Decision
- Canonical host: `https://www.nexuradata.ca`
- Reason: existing redirect policy already forces apex to `www`.

## Change Scope
- Updated `rel="canonical"` host in FR and EN public HTML pages.
- Updated `og:url` host in FR and EN public HTML pages.
- Updated `robots.txt` sitemap endpoints to `https://www.nexuradata.ca/...`.
- Updated `sitemap.xml` `<loc>` entries to `https://www.nexuradata.ca/...`.

## Verification Evidence
Ran repository checks after edits:
- `canonical_apex_left=0`
- `sitemap_apex_left=0`
- `robots_apex_left=0`

Validation commands used:
```bash
rg -n 'rel="canonical" href="https://nexuradata.ca|property="og:url" content="https://nexuradata.ca' -- *.html en/*.html | wc -l
rg -n '<loc>https://nexuradata.ca' sitemap.xml | wc -l
rg -n 'Sitemap: https://nexuradata.ca' robots.txt | wc -l
```

## Primary Files
- `sitemap.xml`
- `robots.txt`
- FR pages at repository root (`*.html`)
- EN mirrors under `en/*.html`

## Operational Notes
- This artifact only standardizes canonical host signals.
- No API behavior changes were introduced by this artifact.
- Deploy required for crawler-visible effect.

## Post-Deploy Actions
1. Re-submit sitemap in Google Search Console:
   - `https://www.nexuradata.ca/sitemap.xml`
2. Re-scrape URLs in Meta Sharing Debugger:
   - `https://www.nexuradata.ca/`
   - `https://www.nexuradata.ca/en/`
3. Confirm selected canonical in Search Console URL Inspection for key FR/EN service pages.

## Suggested Commit Message
`seo(canonical): align canonical/og:url/sitemap/robots to www host`
