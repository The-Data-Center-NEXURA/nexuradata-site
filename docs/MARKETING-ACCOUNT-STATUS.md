# Marketing account status

This file is the single-page tracker for Google and Facebook/Meta launch readiness.

## Repo-ready items

- [x] GA4 installed on public pages with Measurement ID `G-TC31YSS01P`
- [x] CSP allows Google Tag Manager and Google Analytics
- [x] Privacy policy discloses GA4 analytics use and Google opt-out
- [x] Meta Pixel installed with ID `751859640106935`
- [x] CSP allows Meta Pixel script and event endpoints
- [x] Privacy policy discloses Meta Pixel measurement use
- [x] Merchant Center feed exists at `merchant-feed.xml` with French-first service listings
- [x] Google Business Profile asset exists at `assets/icons/gbp-profile.png`
- [x] Google Business Profile cover/social banner exists at `assets/icons/social-banner.png`
- [x] Google Business Profile landing pages and brand fields documented
- [x] Facebook cover exists at `assets/icons/facebook-cover.png`
- [x] Facebook/social profile assets exist at `assets/icons/social-profile.png` and `assets/icons/social-banner.png`
- [x] Intake QR asset exists at `assets/icons/contact-qr.png` and points to `https://nexuradata.ca/#contact`
- [x] Google and Facebook launch posts documented with service-specific landing pages
- [x] Email signature template uses locked `assets/nexuradata-signature.png`
- [x] Facebook/Meta setup runbook exists at `docs/FACEBOOK-META-SETUP.md`
- [x] Google setup runbook exists at `docs/GOOGLE-SETUP.md`
- [x] Production deploy target confirmed as Cloudflare Pages project `nexuradata`
- [x] `https://nexuradata.ca/merchant-feed.xml` returns 200 in production
- [x] `https://nexuradata.ca/assets/icons/facebook-cover.png` returns 200 in production

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
- [ ] `assets/icons/gbp-profile.png`, `assets/icons/social-banner.png` and `assets/icons/contact-qr.png` uploaded to Google Business Profile
- [ ] First Google Business Profile post published with QR/contact link

### Facebook / Meta

- [x] Facebook Page exists as `NEXURADATA` at `https://www.facebook.com/nexuradata`
- [x] Facebook URL restored to homepage structured data `sameAs`
- [ ] Public unauthenticated Facebook Page visibility confirmed
- [ ] Page category set to `Data Recovery Service`
- [ ] Website, email and phone added
- [ ] Profile image uploaded from `assets/icons/social-profile.png`
- [ ] Cover image uploaded from `assets/icons/facebook-cover.png`
- [ ] Intake QR image uploaded or used in pinned post from `assets/icons/contact-qr.png`
- [ ] Service area configured
- [ ] CTA button configured
- [ ] Meta Events Manager confirms Pixel `751859640106935` receives live PageView/Contact events
- [ ] First launch post published
- [ ] Two-week launch content cadence scheduled
- [ ] Page added to Meta Business Suite
- [ ] Two-factor authentication enabled for admins
- [ ] Messaging enabled only if monitored daily

## Do not launch ads until

- public phone number is confirmed
- `contact@nexuradata.ca` is monitored
- Google Business Profile status is known
- Facebook Page admin access is secured
- privacy policy is reviewed if any ad pixel, remarketing or cross-site tracking is added