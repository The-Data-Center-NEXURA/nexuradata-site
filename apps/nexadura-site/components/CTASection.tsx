import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="section-shell py-16">
      <div className="rounded-2xl rounded-bl-md bg-ink p-8 text-paper md:p-10">
        <p className="eyebrow text-amber">Next move</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-black md:text-4xl">Start with the audit. Ship the first automation only after the workflow is clear.</h2>
        <Link href="/automation-audit" className="focus-ring mt-8 inline-flex items-center gap-2 rounded-xl rounded-bl-md bg-paper px-5 py-3 font-semibold text-ink">
          Request the audit
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}