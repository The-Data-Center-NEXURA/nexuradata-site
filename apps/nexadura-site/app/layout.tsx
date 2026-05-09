import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@/components/Analytics";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { brand } from "@/data/site";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://nexadura.ca"),
  title: {
    default: `${brand.name} - Automation audit and implementation`,
    template: `%s - ${brand.name}`,
  },
  description: brand.subheadline,
  openGraph: {
    title: `${brand.name} - Automation audit and implementation`,
    description: brand.subheadline,
    url: "https://nexadura.ca",
    siteName: brand.name,
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Analytics />
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}