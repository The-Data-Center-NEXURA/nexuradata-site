import { LeadForm } from "@/components/LeadForm";

export default function ContactPage() {
  return (
    <section className="section-shell grid gap-10 py-16 md:grid-cols-[0.8fr_1.2fr]">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-4 text-5xl font-black leading-tight">Tell us where the workflow breaks.</h1>
        <p className="mt-6 text-lg leading-8 text-muted">Share the current stack, lead volume, and operational constraint. The response will focus on the next practical move.</p>
      </div>
      <LeadForm formType="contact" />
    </section>
  );
}