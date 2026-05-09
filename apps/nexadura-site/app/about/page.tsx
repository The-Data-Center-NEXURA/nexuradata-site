import type { Metadata } from "next";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "About",
  description: "NEXADURA builds practical automation systems for service businesses with messy intake, CRM, follow-up, and reporting workflows.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <section className="section-shell py-16">
        <p className="eyebrow">About</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight">Automation work for operators, not automation theater.</h1>
        <div className="mt-8 grid gap-6 text-lg leading-8 text-muted md:grid-cols-2">
          <p>NEXADURA helps service businesses turn messy intake, CRM, follow-up, and reporting workflows into systems that are easier to trust and easier to manage.</p>
          <p>The work starts with process clarity. The stack comes after: CRM fields, routing, alerts, follow-up sequences, analytics, and implementation support.</p>
        </div>
      </section>
      <AuditForm />
      <Footer />
    </>
  );
}