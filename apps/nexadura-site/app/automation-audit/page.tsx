import { LeadForm } from "@/components/LeadForm";
import { OfferSection } from "@/components/OfferSection";
import { ProcessSection } from "@/components/ProcessSection";
import { auditOffer, processSteps } from "@/data/site";

export default function AutomationAuditPage() {
  return (
    <>
      <section className="section-shell grid gap-10 py-16 md:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="eyebrow">Automation audit</p>
          <h1 className="mt-4 text-5xl font-black leading-tight">A focused audit before you commit to another tool or workflow rebuild.</h1>
          <p className="mt-6 text-lg leading-8 text-muted">The audit identifies the highest-leverage automations across intake, CRM, follow-up, and analytics, then ranks what to ship first.</p>
        </div>
        <LeadForm formType="audit" />
      </section>
      <OfferSection offer={auditOffer} />
      <ProcessSection steps={processSteps} />
    </>
  );
}