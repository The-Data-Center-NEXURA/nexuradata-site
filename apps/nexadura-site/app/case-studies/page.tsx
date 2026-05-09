import type { Metadata } from "next";
import Link from "next/link";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { caseStudies } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Case Studies",
  description: "Operational automation examples focused on faster response, fewer manual tasks, and clearer pipeline ownership.",
  alternates: { canonical: "/case-studies" },
};

export default function CaseStudiesPage() {
  return (
    <>
      <Navbar />
      <section className="section-shell py-16">
        <p className="eyebrow">Case studies</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight">Operational proof, measured in fewer misses and clearer ownership.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">These examples show the type of before-and-after NEXADURA builds toward: faster response, fewer manual tasks, and more useful pipeline visibility.</p>
      </section>
      <section className="section-shell py-16">
        <p className="eyebrow">Proof patterns</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-black md:text-4xl">Case studies are framed around operational before-and-after, not vanity automation.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {caseStudies.map((study) => (
            <article key={study.title} className="rounded-2xl rounded-bl-md border border-line bg-white/45 p-5">
              <p className="text-sm font-black text-signal">{study.metric}</p>
              <h3 className="mt-4 text-lg font-black">{study.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{study.summary}</p>
              <Link href={`/case-studies/${study.slug}`} className="focus-ring mt-5 inline-flex text-sm font-bold text-ink underline decoration-line underline-offset-4">
                Read the case study
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