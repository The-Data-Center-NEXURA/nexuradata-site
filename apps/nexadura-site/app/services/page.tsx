import type { Metadata } from "next";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Solutions from "@/components/Solutions";
import TrackedLink from "@/components/TrackedLink";

export const metadata: Metadata = {
  title: "Services d'automatisation IA",
  description: "Services NEXURA pour automatiser l'accueil des demandes, le routage CRM, les agents IA internes, les alertes, le suivi et le reporting opérationnel.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Services d'automatisation IA | NEXURA",
    description: "Automatisation du flux demande-vers-revenu, agents IA internes, tableaux de bord et architecture opérationnelle.",
    url: "/services",
  },
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
      <section className="section-shell py-16">
        <p className="eyebrow">Portée des mandats</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-black md:text-4xl">Chaque service relie les outils, les responsables et les signaux qui font avancer le revenu.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            "Capture et qualification des demandes entrantes",
            "Routage CRM, alertes propriétaires et rappels de suivi",
            "Tableaux de bord pour pipeline, délais de réponse et risques",
          ].map((item) => (
            <article key={item} className="rounded-2xl rounded-bl-md border border-line bg-[#0b0b0a]/85 p-5">
              <p className="leading-7 text-muted">{item}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 text-sm font-bold sm:flex-row">
          <TrackedLink href="/automation-audit" className="focus-ring text-signal underline decoration-line underline-offset-4" eventName="cta_click" eventLabel="Commencer par un audit d'automatisation" eventLocation="services_scope">
            Commencer par un audit d'automatisation
          </TrackedLink>
          <TrackedLink href="/case-studies" className="focus-ring text-muted underline decoration-line underline-offset-4 hover:text-paper" eventName="cta_click" eventLabel="Voir les exemples opérationnels" eventLocation="services_scope">
            Voir les exemples opérationnels
          </TrackedLink>
        </div>
      </section>
      <AuditForm />
      <Footer />
    </>
  );
}