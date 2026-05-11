import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TrackedLink from "@/components/TrackedLink";
import { caseStudies } from "@/lib/constants";

type CaseStudyPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return caseStudies.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = caseStudies.find((item) => item.slug === slug);

  if (!study) return {};

  return {
    title: study.title,
    description: study.summary,
    alternates: { canonical: `/case-studies/${study.slug}` },
    openGraph: {
      title: `${study.title} | NEXURA`,
      description: study.summary,
      url: `/case-studies/${study.slug}`,
    },
  };
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const study = caseStudies.find((item) => item.slug === slug);

  if (!study) notFound();

  return (
    <>
      <Navbar />
      <article className="section-shell py-16">
        <Link href="/case-studies" className="focus-ring text-sm font-bold text-muted hover:text-paper">
          Retour aux études de cas
        </Link>
        <p className="eyebrow mt-8">Étude de cas</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight">{study.title}</h1>
        <p className="mt-5 text-xl font-black text-signal">{study.metric}</p>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">{study.summary}</p>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <section className="rounded-2xl rounded-bl-md border border-line bg-[#0b0b0a]/85 p-5">
            <p className="eyebrow">Défi</p>
            <p className="mt-4 leading-7 text-muted">{study.challenge}</p>
          </section>
          <section className="rounded-2xl rounded-bl-md border border-line bg-[#0b0b0a]/85 p-5">
            <p className="eyebrow">Système</p>
            <p className="mt-4 leading-7 text-muted">{study.system}</p>
          </section>
          <section className="rounded-2xl rounded-bl-md border border-line bg-[#0b0b0a]/85 p-5">
            <p className="eyebrow">Résultat</p>
            <p className="mt-4 leading-7 text-muted">{study.outcome}</p>
          </section>
        </div>
        <div className="mt-10 flex flex-col gap-3 text-sm font-bold sm:flex-row">
          <TrackedLink href="/services" className="focus-ring text-muted underline decoration-line underline-offset-4 hover:text-paper" eventName="cta_click" eventLabel="Voir les services liés" eventLocation="case_study_detail">
            Voir les services liés
          </TrackedLink>
          <TrackedLink href="/automation-audit" className="focus-ring text-signal underline decoration-line underline-offset-4" eventName="cta_click" eventLabel="Cartographier un flux similaire" eventLocation="case_study_detail">
            Cartographier un flux similaire
          </TrackedLink>
        </div>
      </article>
      <AuditForm />
      <Footer />
    </>
  );
}