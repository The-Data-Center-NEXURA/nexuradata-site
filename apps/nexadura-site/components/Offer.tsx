import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Offer() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-7xl rounded-3xl border border-blue-500/30 bg-blue-500/10 p-8 md:p-12">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Core Offer</p>
        <div className="grid gap-8 md:grid-cols-[1fr_0.55fr] md:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">AI Workflow Infrastructure Setup</h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
              We audit your operations, design the automation architecture, and deploy a focused system that removes manual work from one high-value workflow.
            </p>
          </div>
          <Link
            href="/automation-audit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Start With an Audit <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}