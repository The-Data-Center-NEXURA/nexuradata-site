import type { Metadata } from "next";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TrackedLink from "@/components/TrackedLink";
import { caseStudies } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Études de cas et exemples d'automatisation IA",
  description: "Exemples NEXURA d'automatisation IA pour le routage entrant, le suivi, la visibilité opérationnelle et la réduction des tâches manuelles.",
  alternates: { canonical: "/case-studies" },
  openGraph: {
    title: "Études de cas et exemples d'automatisation IA | NEXURA",
    description: "Des exemples structurés par défi, système et résultat pour des flux revenus et opérations.",
    url: "/case-studies",
  },
};

export default function CaseStudiesPage() {
  return (
    <>
      <Navbar />
      <section className="section-shell py-16">
        <p className="eyebrow">Études de cas</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight">Des preuves opérationnelles, mesurées en moins de ratés et plus de clarté.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">Ces exemples montrent le type d'avant/après que NEXURA construit : réponse plus rapide, moins de tâches manuelles et meilleure visibilité du pipeline.</p>
      </section>
      <section className="section-shell py-16">
        <p className="eyebrow">Patrons de preuve</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-black md:text-4xl">Les études de cas sont cadrées autour d'un vrai avant/après opérationnel.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {caseStudies.map((study) => (
            <article key={study.title} className="rounded-2xl rounded-bl-md border border-line bg-[#0b0b0a]/85 p-5">
              <p className="text-sm font-black text-signal">{study.metric}</p>
              <h3 className="mt-4 text-lg font-black">{study.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{study.summary}</p>
              <TrackedLink href={`/case-studies/${study.slug}`} className="focus-ring mt-5 inline-flex text-sm font-bold text-signal underline decoration-line underline-offset-4" eventName="case_study_click" eventLabel={study.title} eventLocation="case_studies_grid">
                Lire l'étude de cas
              </TrackedLink>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 text-sm font-bold sm:flex-row">
          <TrackedLink href="/services" className="focus-ring text-muted underline decoration-line underline-offset-4 hover:text-paper" eventName="cta_click" eventLabel="Relier ces exemples aux services" eventLocation="case_studies_footer">
            Relier ces exemples aux services
          </TrackedLink>
          <TrackedLink href="/automation-audit" className="focus-ring text-signal underline decoration-line underline-offset-4" eventName="cta_click" eventLabel="Identifier votre premier cas d'usage" eventLocation="case_studies_footer">
            Identifier votre premier cas d'usage
          </TrackedLink>
        </div>
      </section>
      <AuditForm />
      <Footer />
    </>
  );
}