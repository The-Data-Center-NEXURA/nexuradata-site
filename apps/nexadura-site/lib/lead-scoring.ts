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
    reasons.push("Volume mensuel élevé de demandes");
  }

  if (["now", "30-days"].includes(lead.timeline)) {
    score += 20;
    reasons.push("Échéancier d'implantation rapproché");
  }

  if (["5k-15k", "15k+"].includes(lead.budget)) {
    score += 20;
    reasons.push("Budget compatible avec un mandat d'implantation");
  }

  if (/hubspot|salesforce|pipedrive|zoho|crm|airtable|notion/i.test(lead.currentStack)) {
    score += 10;
    reasons.push("Système existant compatible avec une automatisation CRM");
  }

  if (lead.biggestConstraint.length > 160) {
    score += 10;
    reasons.push("Contrainte opérationnelle détaillée fournie");
  }

  if (["21-50", "51-200", "200+"].includes(lead.teamSize)) {
    score += 10;
    reasons.push("La taille de l'équipe suggère une complexité de transfert");
  }

  const cappedScore = Math.min(score, 100);
  const tier = cappedScore >= 75 ? "priority" : cappedScore >= 45 ? "qualified" : "nurture";

  return {
    score: cappedScore,
    tier,
    reasons,
    nextStep:
      tier === "priority"
        ? "Planifier un appel d'audit de flux d'ici un jour ouvrable."
        : tier === "qualified"
          ? "Envoyer le suivi d'accueil d'audit et demander des captures du flux actuel."
          : "Ajouter à la séquence éducative et revoir quand l'échéancier ou le budget sera plus clair.",
  };
};