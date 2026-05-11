import { describe, expect, it } from "vitest";

import {
  canExecuteRemoteAction,
  classifyRemoteFixCase,
  enforceActionPolicy,
  remoteFixCaseSchema,
  signAgentCommand
} from "../../functions/_lib/remotefix.js";

const client = { name: "Jean Tremblay", email: "jean@example.com", phone: "514-555-0100", type: "individual" };

const intake = (overrides = {}) => ({
  deviceType: "external_drive",
  systemType: "windows",
  symptom: "drive_detected_inaccessible",
  urgency: "standard",
  problemStartedAt: "ce matin",
  containsCriticalData: false,
  attemptedFix: false,
  legalMatter: false,
  notes: "Disque visible dans Windows mais absent d'Explorer.",
  ...overrides
});

describe("RemoteFix rules engine", () => {
  it("classifies a visible inaccessible external drive as DiskFix remote repair", () => {
    const triage = classifyRemoteFixCase("NX-TEST", client, intake());
    expect(triage.service).toBe("NEXURA DiskFix");
    expect(triage.finalDecision).toBe("REMOTE_REPAIR");
    expect(triage.autoRepairAllowed).toBe(true);
    expect(triage.allowedActions).toEqual(expect.arrayContaining(["mount_volume", "assign_drive_letter"]));
    expect(triage.blockedActions).toEqual(expect.arrayContaining(["format", "chkdsk_write", "partition_write"]));
  });

  it("blocks RemoteFix for a clicking drive and transfers to lab", () => {
    const triage = classifyRemoteFixCase("NX-TEST", client, intake({ symptom: "clicking_drive" }));
    expect(triage.finalDecision).toBe("LAB_REQUIRED");
    expect(triage.requiresLab).toBe(true);
    expect(triage.riskLabel).toBe("Critique");
    expect(triage.allowedActions).toEqual([]);
  });

  it("keeps NAS/RAID in read-only server triage", () => {
    const triage = classifyRemoteFixCase("NX-TEST", { ...client, type: "business" }, intake({ deviceType: "nas_server", symptom: "nas_raid_warning", urgency: "priority" }));
    expect(triage.service).toBe("NEXURA Server Triage");
    expect(triage.finalDecision).toBe("LAB_REQUIRED");
    expect(triage.allowedActions).toEqual(expect.arrayContaining(["read_diagnostics", "read_smart", "read_event_logs"]));
    expect(triage.blockedActions).toEqual(expect.arrayContaining(["raid_rebuild", "partition_write", "format"]));
  });

  it("validates runtime input with Zod", () => {
    const parsed = remoteFixCaseSchema.parse({
      client,
      intake: intake({ containsCriticalData: "on", attemptedFix: "false" }),
      idempotencyKey: "rf-1234567890abcdef"
    });
    expect(parsed.intake.containsCriticalData).toBe(true);
    expect(parsed.intake.attemptedFix).toBe(false);
  });
});

describe("RemoteFix action policy", () => {
  it("refuses dangerous actions before the command queue", () => {
    expect(enforceActionPolicy("format")).toMatchObject({ allowedByPolicy: false });
    expect(enforceActionPolicy("raid_rebuild")).toMatchObject({ allowedByPolicy: false });
    expect(enforceActionPolicy("assign_drive_letter")).toMatchObject({ allowedByPolicy: true });
  });

  it("does not let the agent execute without consent, payment and diagnostic approval", () => {
    const triage = classifyRemoteFixCase("NX-TEST", client, intake());
    const diagnostic = {
      safeActionsToOffer: ["assign_drive_letter"],
      blockedActions: []
    };

    expect(canExecuteRemoteAction({ action: "assign_drive_letter", triage, diagnostic, hasConsent: false, hasPaymentOrFreeDiagnostic: true })).toMatchObject({ allowed: false });
    expect(canExecuteRemoteAction({ action: "assign_drive_letter", triage, diagnostic, hasConsent: true, hasPaymentOrFreeDiagnostic: false })).toMatchObject({ allowed: false });
    expect(canExecuteRemoteAction({ action: "assign_drive_letter", triage, diagnostic, hasConsent: true, hasPaymentOrFreeDiagnostic: true })).toMatchObject({ allowed: true });
    expect(canExecuteRemoteAction({ action: "format", triage, diagnostic, hasConsent: true, hasPaymentOrFreeDiagnostic: true })).toMatchObject({ allowed: false });
  });

  it("signs command payloads with the server secret", async () => {
    const signature = await signAgentCommand({ REMOTE_COMMAND_SIGNING_SECRET: "test-signing-secret" }, {
      id: "CMD-1",
      caseId: "NX-TEST",
      action: "assign_drive_letter"
    });
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
  });
});