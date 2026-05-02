# Marketing account status

This file is the single-page tracker for Google and Facebook/Meta launch readiness.

## Repo-ready items

- [x] GA4 installed on public pages with Measurement ID `G-TC31YSS01P`
- [x] CSP allows Google Tag Manager and Google Analytics
- [x] Merchant Center feed exists at `merchant-feed.xml`
- [x] Google Business Profile asset exists at `assets/icons/gbp-profile.png`
- [x] Facebook cover exists at `assets/icons/facebook-cover.png`
- [x] Facebook/social profile assets exist at `assets/icons/social-profile.png` and `assets/icons/social-banner.png`
- [x] Facebook/Meta setup runbook exists at `docs/FACEBOOK-META-SETUP.md`
- [x] Google setup runbook exists at `docs/GOOGLE-SETUP.md`

## Account-side blockers

These cannot be verified from the repository. They must be completed in Google, Meta and Cloudflare dashboards.

### Google

- [ ] Search Console domain property for `nexuradata.ca` verified via DNS TXT
- [ ] `https://nexuradata.ca/sitemap.xml` submitted in Search Console
- [ ] GA4 Realtime confirms traffic for `G-TC31YSS01P`
- [ ] Merchant Center account created
- [ ] Website claimed in Merchant Center
- [ ] `https://nexuradata.ca/merchant-feed.xml` scheduled as a feed
- [ ] Google Business Profile created
- [ ] Google Business Profile verification requested or completed
- [ ] Business hours, phone and services confirmed

### Facebook / Meta

- [ ] Facebook Page created or claimed as `NEXURADATA`
- [ ] Page category set to `Data Recovery Service`
- [ ] Website, email and phone added
- [ ] Profile image uploaded from `assets/icons/social-profile.png`
- [ ] Cover image uploaded from `assets/icons/facebook-cover.png`
- [ ] Service area configured
- [ ] CTA button configured
- [ ] First launch post published
- [ ] Page added to Meta Business Suite
- [ ] Two-factor authentication enabled for admins
- [ ] Messaging enabled only if monitored daily

## Do not launch ads until

- public phone number is confirmed
- `contact@nexuradata.ca` is monitored
- Google Business Profile status is known
- Facebook Page admin access is secured
- privacy policy is reviewed if any ad pixel, remarketing or cross-site tracking is added