import type { Metadata } from "next";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Process from "@/components/Process";
import TrackedLink from "@/components/TrackedLink";
import { auditOffer } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Audit d'automatisation pour flux manuels",
  description: "Demandez un audit NEXURA pour cartographier les blocages, prioriser les automatisations et définir la première couche opérationnelle à livrer.",
  alternates: { canonical: "/automation-audit" },
  openGraph: {
    title: "Audit d'automatisation pour flux manuels | NEXURA",
    description: "Une revue ciblée de vos demandes, outils, propriétaires, suivis et rapports avant de bâtir la prochaine automatisation.",
    url: "/automation-audit",
  },
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
      <section className="section-shell py-16">
        <p className="eyebrow">Quand l'utiliser</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-black md:text-4xl">L'audit sert quand le suivi, le routage ou la visibilité dépend encore trop de la mémoire.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            "Les demandes entrantes ne reçoivent pas toutes une réponse rapide.",
            "Les transferts entre ventes, opérations et livraison sont trop manuels.",
            "Le reporting montre l'activité, mais pas les blocages ni les risques.",
          ].map((item) => (
            <article key={item} className="rounded-2xl rounded-bl-md border border-line bg-[#0b0b0a]/85 p-5">
              <p className="leading-7 text-muted">{item}</p>
            </article>
          ))}
        </div>
        <TrackedLink href="/services" className="focus-ring mt-8 inline-flex text-sm font-bold text-signal underline decoration-line underline-offset-4" eventName="cta_click" eventLabel="Comparer avec les services d'implantation" eventLocation="audit_when_to_use">
          Comparer avec les services d'implantation
        </TrackedLink>
      </section>
      <AuditForm />
      <Process />
      <Footer />
    </>
  );
}