# Google services setup — olivier@nexuradata.ca

## Current repo status

Repo-side Google preparation is mostly complete:

- GA4 Measurement ID `G-TC31YSS01P` is wired into the public HTML pages.
- `_headers` already allows Google Tag Manager and Google Analytics in the CSP.
- `merchant-feed.xml` is published for Merchant Center scheduled fetch.
- Google Business Profile asset is available at `assets/icons/gbp-profile.png`.
- Internal operator pages and non-public utility HTML intentionally do not carry GA4.

Account-side tasks still need confirmation in Google and Cloudflare dashboards:

- Search Console domain property verified by DNS TXT.
- `https://nexuradata.ca/sitemap.xml` submitted.
- GA4 property receiving traffic for `G-TC31YSS01P`.
- Merchant Center account created, website claimed and feed scheduled.
- Google Business Profile created and verification requested or completed.

Pre-launch checklist for connecting NEXURADATA to Google. All properties must be created and owned by **olivier@nexuradata.ca** (Workspace account on `nexuradata.ca`).

> Verification domain: `nexuradata.ca` (apex). Add `www.nexuradata.ca` only after the apex is verified and the redirect in `_redirects` is confirmed.

---

## 1. Google Search Console

1. Go to https://search.google.com/search-console — sign in as `olivier@nexuradata.ca`.
2. **Add property → Domain** → enter `nexuradata.ca`.
3. Choose **DNS verification (TXT record)**. Copy the `google-site-verification=...` value.
4. Add the TXT record at the registrar (Cloudflare DNS):
   - Type: `TXT`
   - Name: `@`
   - Value: `google-site-verification=...`
   - TTL: Auto
5. Wait 2–10 minutes, click **Verify**.
6. Once verified:
   - **Sitemaps** → submit `https://nexuradata.ca/sitemap.xml`.
   - **Settings → Users and permissions** → confirm `olivier@nexuradata.ca` is **Owner**.
   - **Settings → Associations** → link the Google Analytics 4 property (after step 2).

> Domain verification covers both `https://nexuradata.ca/` and `https://nexuradata.ca/en/` automatically — no per-language property needed.

---

## 2. Google Analytics 4 (GA4)

1. Go to https://analytics.google.com → sign in as `olivier@nexuradata.ca`.
2. **Admin → Create → Account**: `NEXURADATA` (Canada, CAD, English).
3. **Create property**: `nexuradata.ca`, time zone `America/Montreal`, currency `CAD`.
4. Industry: `Business & Industrial Markets`. Size: `Small`.
5. **Data stream → Web** → URL `https://nexuradata.ca`, name `NEXURADATA Web`.
6. Measurement ID currently wired in repo: `G-TC31YSS01P`.
7. Confirm in GA4 Realtime that visits to `https://nexuradata.ca/` are received after deployment.

### Recommended GA4 settings

- **Data Settings → Data Collection**: enable Google Signals **only** if you publish a privacy policy update (currently we collect minimal data — leave OFF for the v1 launch).
- **Data Retention**: set to **14 months** (max under default plan).
- **IP Anonymization**: GA4 anonymizes by default — no action.
- **Events**: keep enhanced measurement ON (page_view, scroll, outbound clicks, file_download).
- Mark **`form_submit`** as a conversion once the intake form starts firing it.

---

## 3. Google Merchant Center (already prepped)

Feed already published at `https://nexuradata.ca/merchant-feed.xml` (RSS 2.0 with `g:` namespace). The current feed is French-first and points to the French public pages.

1. Go to https://merchants.google.com → sign in as `olivier@nexuradata.ca`.
2. **Create account** → business name `NEXURADATA`, country `Canada`, time zone `America/Montreal`.
3. **Tools → Business information → Website** → claim `https://nexuradata.ca` (use Search Console verification — auto-claims since same Google account).
4. **Products → Feeds → Add primary feed**:
   - Country: `Canada`
   - Language: `French`
   - Destination: `Free product listings` (skip Shopping ads for now)
   - Name: `NEXURADATA services FR`
   - Method: **Scheduled fetch**
   - URL: `https://nexuradata.ca/merchant-feed.xml`
   - Frequency: weekly, Monday 06:00 ET
5. (Optional) Add a separate English feed later as `merchant-feed-en.xml` with English titles, descriptions and `/en/` links.

---

## 4. Google Business Profile (Maps + local SEO)

1. Go to https://business.google.com → sign in as `olivier@nexuradata.ca`.
2. **Add business** → name `NEXURADATA`, category `Data recovery service`.
3. Address: lab address in Montreal (do **not** publish if it's a residential address — choose "I deliver goods and services to my customers" and set a service area).
4. Service area: `Montréal`, `Laval`, `Longueuil`, `Brossard`, `Boucherville`, `Saint-Léonard`, `Anjou`, `Lachine`, `LaSalle`, `Verdun` (matches `zones-desservies-montreal-quebec.html`).
5. Phone: lab phone. Website: `https://nexuradata.ca/`.
6. Verification: postcard or video (Google's choice). Allow 5–14 days.
7. After verification:
   - Add hours, services (mirror items in `tarifs-recuperation-donnees-montreal.html`).
   - Upload profile/logo image: `assets/icons/gbp-profile.png` (720 × 720).
   - Upload cover/brand image: `assets/icons/social-banner.png` (1500 × 500).
   - Enable messaging only if someone monitors it daily.

### Google profile branding fields

Use these fields exactly unless operations have changed:

- Public name: `NEXURADATA`
- Primary category: `Data recovery service`
- Website button / main landing page: `https://nexuradata.ca/`
- Quote/contact landing page: `https://nexuradata.ca/#contact`
- Services landing page: `https://nexuradata.ca/services-recuperation-forensique-montreal.html`
- Pricing/intervention landing page: `https://nexuradata.ca/tarifs-recuperation-donnees-montreal.html`
- Public email: `contact@nexuradata.ca`
- Privacy email: `privacy@nexuradata.ca`
- Phone: use only the confirmed public lab phone.

Short description:

```text
NEXURADATA accompagne les dossiers de récupération de données, RAID, SSD, mobile et forensique numérique pour Montréal et le Grand Montréal. Les demandes sont qualifiées avant intervention, avec confidentialité, suivi par dossier et cadre de paiement ou d'autorisation clair.
```

Do not add a Facebook profile to structured data or Google public links until the Facebook Page is created, secured and controlled by NEXURADATA.

---

## 5. Code wiring status

Search Console TXT verification is DNS-only — no code change needed for SC.

**For GA4** the repo already includes:

1. A GA4 snippet on public HTML pages just before `</head>`:
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-TC31YSS01P"></script>
   <script>
     window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
     gtag('js',new Date());gtag('config','G-TC31YSS01P');
   </script>
   ```
2. CSP in [_headers](../_headers):
   - `script-src` and `script-src-elem` allow `https://www.googletagmanager.com`
   - `connect-src` allows `https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.g.doubleclick.net`
   - `img-src` allows `https://www.google-analytics.com https://*.g.doubleclick.net`
3. Update `docs/branding-read-only.txt` only if a cookie/consent banner is added (not required for GA4 anonymized in QC under Law 25 if no advertising features are enabled).

---

## 6. Law 25 (Quebec) compliance note

Under Law 25, GA4 with **default settings + IP anonymization + Google Signals OFF** is acceptable as analytics-only without prior consent, provided:

- The privacy policy ([politique-confidentialite.html](../politique-confidentialite.html)) discloses analytics use, the data collected, the retention period, and the recipient (Google LLC, USA).
- Users can opt out (link to https://tools.google.com/dlpage/gaoptout in the privacy policy).
- No remarketing, advertising features, or cross-device tracking is enabled.

If marketing/ads features are turned on later, a consent banner becomes mandatory.

---

## Quick checklist

- [ ] Search Console domain property verified via DNS TXT
- [ ] `sitemap.xml` submitted in Search Console
- [ ] GA4 property confirmed live for Measurement ID `G-TC31YSS01P`
- [ ] Merchant Center account created, website claimed, feed scheduled
- [ ] Business Profile created, verification requested
- [x] GA4 snippet wired into public HTML + CSP updated
- [ ] Privacy policy reviewed for Law 25 compliance
