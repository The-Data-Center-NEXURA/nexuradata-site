import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact NEXADURA to review where your current lead, CRM, follow-up, or reporting workflow breaks.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">Contact</p>
          <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
            Let&apos;s identify your highest-value automation opportunity.
          </h1>
        </div>
      </section>
      <AuditForm />
      <Footer />
    </main>
  );
}