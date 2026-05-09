import { SolutionGrid } from "@/components/SolutionGrid";
import { CTASection } from "@/components/CTASection";
import { solutions } from "@/data/site";

export default function ServicesPage() {
  return (
    <>
      <section className="section-shell py-16">
        <p className="eyebrow">Services</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight">Automation strategy and implementation for the lead-to-revenue workflow.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">NEXADURA focuses on operational automations that help service teams capture leads, qualify opportunities, follow up on time, and see what is working.</p>
      </section>
      <SolutionGrid solutions={solutions} />
      <CTASection />
    </>
  );
}