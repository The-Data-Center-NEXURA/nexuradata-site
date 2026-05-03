import { describe, expect, it } from "vitest";
import {
  buildCaseAutomationDraft,
  inferCaseCategory,
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
    expect(draft.qualificationSummary).toContain("Catégorie:");
    expect(draft.handlingFlags).toContain("raid");
  });
});