import { describe, expect, it } from "vitest";
import {
  buildAutomationTimeline,
  buildCaseAutomationDraft,
  formatAutomationEventNote,
  inferCaseCategory,
  inferClientNeed,
  inferEmotionalContext,
  inferExpertSignals,
  inferMissingInformation,
  inferRiskFlags
} from "../../functions/_lib/automation.js";

describe("inferCaseCategory()", () => {
  it("detects RAID and continuity cases", () => {
    expect(inferCaseCategory("RAID / NAS / serveur", "Synology rebuild failed")).toBe("raid");
  });

  it("detects forensic and legal cases", () => {
    expect(inferCaseCategory("Je ne sais pas", "Incident avec assurance et preuve à préserver")).toBe("forensic");
  });

  it("detects mobile cases", () => {
    expect(inferCaseCategory("Téléphone / mobile", "iPhone verrouillé après plusieurs essais")).toBe("mobile");
  });
});

describe("inferRiskFlags()", () => {
  it("flags physical and overwrite risks", () => {
    const flags = inferRiskFlags({
      support: "Disque dur",
      urgence: "Rapide",
      impact: "Données importantes",
      sensibilite: "Standard",
      message: "Le disque clique et une tentative de formatage a été lancée."
    });

    expect(flags).toContain("physical-risk");
    expect(flags).toContain("overwrite-risk");
  });

  it("flags incident response and forensic boundaries", () => {
    const flags = inferRiskFlags({
      support: "Forensique / preuve numérique",
      urgence: "Très sensible",
      impact: "Client, juridique ou assurance impliqué",
      sensibilite: "Preuve / chaîne de possession",
      message: "Ransomware possible, assureur impliqué."
    });

    expect(flags).toContain("incident-response");
    expect(flags).toContain("forensic-boundary");
    expect(flags).toContain("priority-response");
  });

  it("keeps priority markers from qualified intake messages", () => {
    const flags = inferRiskFlags({
      support: "Disque dur",
      urgence: "Standard",
      message: "Impact d'affaires: Opérations bloquées\nSensibilité du dossier: Confidentiel\n\nDescription:\nDisque externe non reconnu."
    });

    expect(flags).toContain("priority-response");
  });
});

describe("inferMissingInformation()", () => {
  it("asks for RAID layout details when absent", () => {
    expect(inferMissingInformation({ telephone: "514", message: "NAS inaccessible" }, "raid")).toContain("raid-layout");
  });

  it("asks for phone number when absent", () => {
    expect(inferMissingInformation({ message: "USB inaccessible" }, "media")).toContain("telephone");
  });

  it("accepts case-detail phone fields as a phone number", () => {
    expect(inferMissingInformation({ phone: "514", message: "USB inaccessible" }, "media")).not.toContain("telephone");
  });
});

describe("client intelligence", () => {
  it("detects personal memory loss and distress", () => {
    const submission = {
      message: "Je suis en panique, le disque contient les photos de mon père décédé."
    };

    expect(inferClientNeed(submission).key).toBe("personal_memory");
    expect(inferEmotionalContext(submission).signal).toBe("distressed");
  });

  it("detects business continuity pressure", () => {
    const submission = {
      support: "Serveur",
      impact: "Operations blocked",
      message: "Payroll server down and production is blocked."
    };

    expect(inferClientNeed(submission).key).toBe("business_continuity");
    expect(inferEmotionalContext(submission).signal).toBe("business_pressure");
  });
});

describe("inferExpertSignals()", () => {
  it("detects hidden contradictions and risky repair attempts", () => {
    const signals = inferExpertSignals({
      support: "Disque dur",
      urgence: "Standard",
      impact: "Planifié / non urgent",
      message: "NAS Synology avec payroll bloqué. CHKDSK et rebuild déjà tentés."
    });

    expect(signals.contradictions).toEqual(expect.arrayContaining(["support-context-mismatch", "urgency-understated"]));
    expect(signals.hiddenHazards).toContain("repair-tool-attempted");
    expect(signals.scoreBoost).toBeGreaterThanOrEqual(5);
  });

  it("detects credential-dependent sensitive cases", () => {
    const signals = inferExpertSignals({
      support: "Téléphone / mobile",
      message: "iPhone verrouillé, passcode inconnu, preuve pour assurance."
    });

    expect(signals.signals).toEqual(expect.arrayContaining(["credential-dependent", "forensic-context-hidden"]));
  });
});

describe("buildCaseAutomationDraft()", () => {
  it("builds an operator-ready draft", () => {
    const draft = buildCaseAutomationDraft({
      telephone: "514-000-0000",
      support: "RAID / NAS / serveur",
      urgence: "Urgent",
      impact: "Opérations bloquées",
      sensibilite: "Confidentiel",
      message: "NAS QNAP inaccessible après tentative de rebuild."
    });

    expect(draft.category).toBe("raid");
    expect(draft.riskLevel).toBe("high");
    expect(draft.recommendedPath).toBe("Intervention continuité d'activité");
    expect(draft.serviceLevel).toBe("emergency");
    expect(draft.expertSignals.signals).toContain("repair-tool-attempted");
    expect(draft.clientNeed.key).toBe("business_continuity");
    expect(draft.proposal.primary).toContain("continuité");
    expect(draft.servicePath).toBe("/recuperation-raid-ssd-montreal.html");
    expect(draft.statusPlan.status).toBe("Diagnostic en cours");
    expect(draft.quotePlan.paymentKind).toBe("deposit");
    expect(draft.clientActions[0]).toContain("Ne lancez aucune reconstruction");
    expect(draft.operatorTasks).toEqual(expect.arrayContaining([
      expect.stringContaining("Valider modèle NAS")
    ]));
    expect(draft.automationActions).toContain("urgent-escalation-prepared");
    expect(draft.automationActions).toContain("expert-signal-layer-applied");
    expect(draft.qualificationSummary).toContain("Catégorie:");
    expect(draft.qualificationSummary).toContain("Signaux experts:");
    expect(draft.handlingFlags).toContain("raid");
  });

  it("adds repair and encryption questions when hidden tool or access risks appear", () => {
    const draft = buildCaseAutomationDraft({
      telephone: "514-000-0000",
      support: "Disque dur",
      urgence: "Standard",
      message: "BitLocker actif. CHKDSK lancé hier, mais la clé de récupération n'est pas confirmée."
    });

    expect(draft.missingInfo).toEqual(expect.arrayContaining(["repair-attempts", "encryption-access"]));
    expect(draft.operatorTasks).toEqual(expect.arrayContaining([
      expect.stringContaining("commandes/outils exacts"),
      expect.stringContaining("accès disponibles")
    ]));
  });

  it("promotes distressed personal-memory cases to priority", () => {
    const draft = buildCaseAutomationDraft({
      telephone: "514-000-0000",
      support: "Disque dur",
      urgence: "Standard",
      message: "Je suis en panique, le disque contient les photos de mon père décédé."
    });

    expect(draft.clientNeed.key).toBe("personal_memory");
    expect(draft.emotionalContext.signal).toBe("distressed");
    expect(draft.serviceLevel).toBe("priority");
    expect(draft.proposal.primary).toContain("souvenirs");
  });

  it("builds a timeline and audit note from the automation plan", () => {
    const draft = buildCaseAutomationDraft({
      telephone: "514-000-0000",
      support: "Forensique / preuve numérique",
      urgence: "Très sensible",
      sensibilite: "Preuve / chaîne de possession",
      message: "Preuve à préserver pour assurance."
    });

    const timeline = buildAutomationTimeline(draft);
    expect(timeline.map((step) => step.title)).toContain("Revue humaine sensible");
    expect(formatAutomationEventNote(draft)).toContain("Plan paiement:");
    expect(formatAutomationEventNote(draft)).toContain("Besoin client:");
  });
});