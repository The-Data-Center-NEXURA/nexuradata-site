import type { Metadata } from "next";
import Link from "next/link";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { caseStudies } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Études de cas",
  description: "Exemples d'automatisation opérationnelle axés sur une réponse plus rapide, moins de tâches manuelles et une meilleure propriété du pipeline.",
  alternates: { canonical: "/case-studies" },
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
              <Link href={`/case-studies/${study.slug}`} className="focus-ring mt-5 inline-flex text-sm font-bold text-signal underline decoration-line underline-offset-4">
                Lire l'étude de cas
              </Link>
            </article>
          ))}
        </div>
      </section>
      <AuditForm />
      <Footer />
    </>
  );
}