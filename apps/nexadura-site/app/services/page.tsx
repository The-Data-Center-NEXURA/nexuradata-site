import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Solutions from "@/components/Solutions";
import AuditForm from "@/components/AuditForm";

export const metadata: Metadata = {
  title: "Services",
  description: "Automation strategy and implementation for intake, lead scoring, CRM routing, email alerts, follow-up sequences, and conversion tracking.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">Services</p>
          <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
            AI automation systems built for operational leverage.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Nexadura helps companies automate workflows, qualify leads, improve reporting, and deploy internal AI systems that reduce manual work.
          </p>
        </div>
      </section>
      <Solutions />
      <AuditForm />
      <Footer />
    </main>
  );
}