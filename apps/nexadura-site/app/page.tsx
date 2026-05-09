import { CaseStudyPreview } from "@/components/CaseStudyPreview";
import { CTASection } from "@/components/CTASection";
import { Hero } from "@/components/Hero";
import { OfferSection } from "@/components/OfferSection";
import { ProblemSection } from "@/components/ProblemSection";
import { ProcessSection } from "@/components/ProcessSection";
import { SolutionGrid } from "@/components/SolutionGrid";
import { auditOffer, caseStudies, painPoints, processSteps, solutions } from "@/data/site";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSection problems={painPoints} />
      <SolutionGrid solutions={solutions} />
      <ProcessSection steps={processSteps} />
      <OfferSection offer={auditOffer} />
      <CaseStudyPreview studies={caseStudies} />
      <CTASection />
    </>
  );
}