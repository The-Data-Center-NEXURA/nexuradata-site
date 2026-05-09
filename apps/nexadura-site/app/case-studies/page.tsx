import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { caseStudies } from "@/data/site";

export const metadata: Metadata = {
  title: "Case Studies",
  description: "Operational automation examples focused on faster response, fewer manual tasks, and clearer pipeline ownership.",
  alternates: { canonical: "/case-studies" },
};

export default function CaseStudiesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">Case Studies</p>
          <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
            Examples of automation systems Nexadura can deploy.
          </h1>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {caseStudies.map((item) => (
              <Link key={item.slug} href={`/case-studies/${item.slug}`} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 transition hover:border-blue-500/60">
                <h2 className="text-2xl font-semibold">{item.title}</h2>
                <p className="mt-4 leading-7 text-slate-300">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}