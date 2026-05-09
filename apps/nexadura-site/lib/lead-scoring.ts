import type { LeadPayload } from "@/lib/validation";

export type LeadScore = {
  score: number;
  tier: "priority" | "qualified" | "nurture";
  reasons: string[];
  nextStep: string;
};

export const scoreLead = (lead: LeadPayload): LeadScore => {
  let score = lead.formType === "audit" ? 25 : 10;
  const reasons: string[] = [];

  if (["101-500", "500+"].includes(lead.monthlyLeadVolume)) {
    score += 20;
    reasons.push("High monthly lead volume");
  }

  if (["now", "30-days"].includes(lead.timeline)) {
    score += 20;
    reasons.push("Near-term implementation timeline");
  }

  if (["5k-15k", "15k+"].includes(lead.budget)) {
    score += 20;
    reasons.push("Budget fits implementation work");
  }

  if (/hubspot|salesforce|pipedrive|zoho|crm|airtable|notion/i.test(lead.currentStack)) {
    score += 10;
    reasons.push("Existing system can receive CRM automation");
  }

  if (lead.biggestConstraint.length > 160) {
    score += 10;
    reasons.push("Detailed operational pain provided");
  }

  if (["21-50", "51-200", "200+"].includes(lead.teamSize)) {
    score += 10;
    reasons.push("Team size suggests handoff complexity");
  }

  const cappedScore = Math.min(score, 100);
  const tier = cappedScore >= 75 ? "priority" : cappedScore >= 45 ? "qualified" : "nurture";

  return {
    score: cappedScore,
    tier,
    reasons,
    nextStep:
      tier === "priority"
        ? "Book a workflow audit call within one business day."
        : tier === "qualified"
          ? "Send the audit intake follow-up and request current workflow screenshots."
          : "Add to the education sequence and revisit when timeline or budget is clearer.",
  };
};