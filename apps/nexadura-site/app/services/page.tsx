import type { Metadata } from "next";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Solutions from "@/components/Solutions";

export const metadata: Metadata = {
  title: "Services",
  description: "Automation strategy and implementation for intake, lead scoring, CRM routing, email alerts, follow-up sequences, and conversion tracking.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <section className="section-shell py-16">
        <p className="eyebrow">Services</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight">Automation strategy and implementation for the lead-to-revenue workflow.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">NEXADURA focuses on operational automations that help service teams capture leads, qualify opportunities, follow up on time, and see what is working.</p>
      </section>
      <Solutions />
      <AuditForm />
      <Footer />
    </>
  );
}