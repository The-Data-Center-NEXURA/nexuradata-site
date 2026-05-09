import type { Metadata } from "next";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact NEXADURA to review where your current lead, CRM, follow-up, or reporting workflow breaks.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <section className="section-shell py-16">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight">Tell us where the workflow breaks.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">Share the current stack, lead volume, and operational constraint. The response will focus on the next practical move.</p>
      </section>
      <AuditForm formType="contact" />
      <Footer />
    </>
  );
}