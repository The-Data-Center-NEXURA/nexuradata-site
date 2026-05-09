import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About",
  description: "NEXADURA builds practical automation systems for service businesses with messy intake, CRM, follow-up, and reporting workflows.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">About Nexadura</p>
          <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
            We build the systems behind faster companies.
          </h1>
          <p className="mt-8 text-lg leading-8 text-slate-300">
            Nexadura is an AI automation and operational intelligence company focused on removing bottlenecks from modern businesses. We design systems that connect people, tools, data, and execution into repeatable infrastructure.
          </p>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Our work is built around one principle: companies do not scale because they are busy. They scale because their systems create leverage.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}