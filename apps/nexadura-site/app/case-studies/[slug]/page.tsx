import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
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
        <Link href="/case-studies" className="focus-ring text-sm font-bold text-muted hover:text-ink">
          Back to case studies
        </Link>
        <p className="eyebrow mt-8">Case study</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight">{study.title}</h1>
        <p className="mt-5 text-xl font-black text-signal">{study.metric}</p>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">{study.summary}</p>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <section className="rounded-2xl rounded-bl-md border border-line bg-white/45 p-5">
            <p className="eyebrow">Challenge</p>
            <p className="mt-4 leading-7 text-muted">{study.challenge}</p>
          </section>
          <section className="rounded-2xl rounded-bl-md border border-line bg-white/45 p-5">
            <p className="eyebrow">System</p>
            <p className="mt-4 leading-7 text-muted">{study.system}</p>
          </section>
          <section className="rounded-2xl rounded-bl-md border border-line bg-white/45 p-5">
            <p className="eyebrow">Outcome</p>
            <p className="mt-4 leading-7 text-muted">{study.outcome}</p>
          </section>
        </div>
      </article>
      <AuditForm />
      <Footer />
    </>
  );
}