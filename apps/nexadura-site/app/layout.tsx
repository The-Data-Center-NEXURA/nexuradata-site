import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexadura | AI Automation Infrastructure",
  description:
    "Nexadura builds AI-powered operational systems that help companies automate workflows, scale execution, and eliminate bottlenecks.",
  keywords: [
    "AI automation",
    "business automation",
    "workflow automation",
    "AI systems",
    "operational intelligence",
    "Nexadura",
  ],
  openGraph: {
    title: "Nexadura | AI Automation Infrastructure",
    description:
      "AI-powered systems that eliminate operational bottlenecks and help companies scale execution.",
    url: "https://nexadura.ca",
    siteName: "Nexadura",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <body>
        {gaId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} window.gtag = gtag; gtag('js', new Date()); gtag('config', '${gaId}');`}
            </Script>
          </>
        ) : null}
        {children}
      </body>
    </html>
  );
}