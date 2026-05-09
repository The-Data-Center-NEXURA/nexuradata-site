import type { Metadata } from "next";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Process from "@/components/Process";
import { auditOffer } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Audit d'automatisation",
  description: "Demandez un audit d'automatisation ciblé pour améliorer l'accueil, le CRM, le suivi, l'analytique et le flux demande-vers-revenu.",
  alternates: { canonical: "/automation-audit" },
};

export default function AutomationAuditPage() {
  return (
    <>
      <Navbar />
      <section className="section-shell py-16">
        <p className="eyebrow">Audit d'automatisation</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight">Un audit ciblé avant d'ajouter un autre outil ou de reconstruire le flux.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{auditOffer.description}</p>
      </section>
      <AuditForm />
      <Process />
      <Footer />
    </>
  );
}