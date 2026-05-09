import type { Metadata } from "next";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Solutions from "@/components/Solutions";

export const metadata: Metadata = {
  title: "Services",
  description: "Stratégie et implantation d'automatisation pour l'accueil, la qualification, le routage CRM, les alertes courriel, les séquences de suivi et le suivi de conversion.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <section className="section-shell py-16">
        <p className="eyebrow">Services</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight">Stratégie et implantation d'automatisation pour le flux demande-vers-revenu.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">NEXURA se concentre sur les automatisations opérationnelles qui aident les équipes de services à capter les demandes, qualifier les occasions, suivre à temps et voir ce qui fonctionne.</p>
      </section>
      <Solutions />
      <AuditForm />
      <Footer />
    </>
  );
}