import { describe, expect, it } from "vitest";
import { buildConciergeDraft, normalizeWhatsAppPhone } from "../../functions/_lib/concierge.js";

describe("normalizeWhatsAppPhone()", () => {
  it("normalizes Canadian phone numbers for WhatsApp", () => {
    expect(normalizeWhatsAppPhone("438 813 0592")).toBe("14388130592");
    expect(normalizeWhatsAppPhone("+1 (514) 555-0101")).toBe("15145550101");
  });

  it("returns an empty value for incomplete numbers", () => {
    expect(normalizeWhatsAppPhone("514")).toBe("");
  });
});

describe("buildConciergeDraft()", () => {
  it("builds a WhatsApp-ready priority concierge message", () => {
    const draft = buildConciergeDraft({
      caseId: "NX-20260503-ABC123",
      name: "Client Test",
      email: "client@example.com",
      phone: "438-813-0592",
      support: "RAID / NAS / serveur",
      urgency: "Urgent",
      message: "NAS QNAP inaccessible après tentative de rebuild."
    });

    expect(draft.provider).toBe("nexuradata-concierge");
    expect(draft.channel).toBe("whatsapp");
    expect(draft.priority).toBe("assisted");
    expect(draft.clientMessage).toContain("Votre dossier NX-20260503-ABC123 est ouvert");
    expect(draft.clientMessage).toContain("Ne lancez aucune reconstruction");
    expect(draft.clientMessage).toContain("Proposition:");
    expect(draft.expertSignals.signals).toContain("repair-tool-attempted");
    expect(draft.clientNeed.key).toBe("business_continuity");
    expect(draft.emotionalContext.signal).toBe("business_pressure");
    expect(draft.serviceLevel).toBe("emergency");
    expect(draft.operatorSummary).toContain("Signaux experts:");
    expect(draft.operatorTasks).toEqual(expect.arrayContaining([
      expect.stringContaining("Valider modèle NAS")
    ]));
    expect(draft.quotePlan.paymentKind).toBe("deposit");
    expect(draft.whatsappUrl).toContain("https://wa.me/14388130592");
  });

  it("requires human review for forensic or legal cases", () => {
    const draft = buildConciergeDraft({
      caseId: "NX-20260503-LEGAL",
      name: "Cabinet",
      email: "legal@example.com",
      support: "Forensique / preuve numérique",
      urgency: "Très sensible",
      message: "Preuve à préserver dans un dossier sensible."
    });

    expect(draft.channel).toBe("email");
    expect(draft.priority).toBe("human_review");
    expect(draft.shouldHumanReview).toBe(true);
    expect(draft.clientNeed.key).toBe("legal_or_insurance");
    expect(draft.emotionalContext.signal).toBe("legal_anxiety");
    expect(draft.proposal.primary).toContain("revue humaine");
    expect(draft.serviceLevel).toBe("sensitive");
    expect(draft.questions).toContain("chronologie courte et contexte légal, RH ou assurance");
    expect(draft.automationActions).toContain("human-review-boundary-applied");
  });
});
