import type { Metadata } from "next";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Process from "@/components/Process";
import { auditOffer } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Automation Audit",
  description: "Request a focused automation audit for intake, CRM, follow-up, analytics, and lead-to-revenue workflow improvements.",
  alternates: { canonical: "/automation-audit" },
};

export default function AutomationAuditPage() {
  return (
    <>
      <Navbar />
      <section className="section-shell py-16">
        <p className="eyebrow">Automation audit</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight">A focused audit before you commit to another tool or workflow rebuild.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{auditOffer.description}</p>
      </section>
      <AuditForm />
      <Process />
      <Footer />
    </>
  );
}