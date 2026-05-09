import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import PageViewTracker from "@/components/PageViewTracker";
import { brand } from "@/lib/constants";
import "./globals.css";

const siteOrigin = `https://${brand.domain}`;
const organizationId = `${siteOrigin}/#organization`;

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": organizationId,
  name: brand.name,
  url: siteOrigin,
  inLanguage: "fr-CA",
  description:
    "Systèmes d'automatisation IA pour l'accueil des demandes, le routage CRM, le suivi et la visibilité opérationnelle.",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    url: `${siteOrigin}/contact`,
    availableLanguage: ["fr-CA", "en-CA"],
  },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${siteOrigin}/services#automation-service`,
  name: "Automatisation IA des revenus et opérations",
  url: `${siteOrigin}/services`,
  provider: {
    "@type": "Organization",
    "@id": organizationId,
    name: brand.name,
    url: siteOrigin,
  },
  areaServed: [
    { "@type": "AdministrativeArea", name: "Québec" },
    { "@type": "Country", name: "Canada" },
  ],
  serviceType: "AI workflow automation",
  inLanguage: "fr-CA",
  description:
    "Audit, architecture et implantation de flux automatisés pour demandes entrantes, CRM, suivi, alertes et reporting opérationnel.",
};

export const metadata: Metadata = {
  metadataBase: new URL(`https://${brand.domain}`),
  title: {
    default: "NEXURA | Automatisation IA pour revenus et opérations",
    template: "%s | NEXURA",
  },
  description:
    "NEXURA conçoit des systèmes d'automatisation IA pour l'accueil des demandes, le routage CRM, le suivi, les alertes et la visibilité opérationnelle.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "NEXURA | Automatisation IA pour revenus et opérations",
    description:
      "Systèmes d'automatisation IA pour relier demandes entrantes, qualification, CRM, suivi et reporting opérationnel.",
    url: "/",
    siteName: brand.name,
    locale: "fr_CA",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <html lang="fr-CA">
      <body>
        <Script id="nexura-organization-jsonld" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify(organizationJsonLd)}
        </Script>
        <Script id="nexura-service-jsonld" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify(serviceJsonLd)}
        </Script>
        {gaId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} window.gtag = gtag; gtag('js', new Date()); gtag('config', '${gaId}');`}
            </Script>
          </>
        ) : null}
        {metaPixelId ? (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '${metaPixelId}'); fbq('track', 'PageView');`}
          </Script>
        ) : null}
        <PageViewTracker />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
