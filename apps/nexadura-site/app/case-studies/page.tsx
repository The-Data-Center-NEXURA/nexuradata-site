import { CaseStudyPreview } from "@/components/CaseStudyPreview";
import { CTASection } from "@/components/CTASection";
import { caseStudies } from "@/data/site";

export default function CaseStudiesPage() {
  return (
    <>
      <section className="section-shell py-16">
        <p className="eyebrow">Case studies</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight">Operational proof, measured in fewer misses and clearer ownership.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">These examples show the type of before-and-after NEXADURA builds toward: faster response, fewer manual tasks, and more useful pipeline visibility.</p>
      </section>
      <CaseStudyPreview studies={caseStudies} />
      <CTASection />
    </>
  );
}