import { z } from "zod";

import { createCase, formatCurrency, getPublicOrigin, normalizeCaseId, normalizeMultilineText, normalizeText, recordCaseEvent } from "./cases.js";
import { getCaseDetail } from "./cases.js";
import { getDb } from "./db.js";
import { sendResendEmail } from "./email.js";

const encoder = new TextEncoder();

const escapeHtml = (value) => `${value ?? ""}`
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

export const remoteFixConfig = {
  appName: "NEXURA RemoteFix",
  currency: "CAD",
  tokenTtlMinutes: 45,
  maxAutoRepairRisk: 35,
  termsVersion: "remotefix-terms-2026-05-07"
};

export const clientTypes = ["individual", "business", "lawyer", "insurance"];
export const deviceTypes = ["external_drive", "ssd_nvme", "windows_pc", "mac", "linux", "cloud", "outlook", "nas_server", "phone", "ransomware"];
export const systemTypes = ["windows", "macos", "linux", "nas", "ios", "android", "cloud", "unknown"];
export const symptoms = [
  "drive_detected_inaccessible",
  "format_prompt",
  "deleted_files",
  "cloud_sync_stuck",
  "outlook_missing_mail",
  "system_slow_errors",
  "nas_raid_warning",
  "clicking_drive",
  "ssd_not_detected",
  "encrypted_files",
  "unknown"
];
export const urgencyLevels = ["standard", "priority", "emergency"];

export const remoteActions = [
  "read_diagnostics",
  "read_smart",
  "read_event_logs",
  "read_cloud_metadata",
  "read_outlook_profile",
  "mount_volume",
  "assign_drive_letter",
  "restart_sync_service",
  "reindex_outlook",
  "recover_to_external_destination",
  "format",
  "chkdsk_write",
  "partition_write",
  "raid_rebuild",
  "delete_files",
  "overwrite_cloud_versions",
  "restore_to_same_disk",
  "firmware_reset"
];

export const remoteFixServices = {
  diskfix: {
    name: "NEXURA DiskFix",
    diagnosticCents: 4900,
    repairMinCents: 9900,
    repairMaxCents: 14900,
    mode: "safe_repair"
  },
  cloudrescue: {
    name: "NEXURA CloudRescue",
    repairMinCents: 14900,
    repairMaxCents: 39900,
    mode: "safe_repair"
  },
  outlookrescue: {
    name: "NEXURA OutlookRescue",
    repairMinCents: 19900,
    repairMaxCents: 49900,
    mode: "safe_repair"
  },
  servertriage: {
    name: "NEXURA Server Triage",
    diagnosticMinCents: 39900,
    diagnosticMaxCents: 120000,
    mode: "diagnostic_only"
  },
  ransomware: {
    name: "NEXURA Ransomware First Response",
    diagnosticMinCents: 49900,
    diagnosticMaxCents: 250000,
    mode: "diagnostic_only"
  }
};

export const actionPolicy = {
  read_diagnostics: { category: "read_only", requiresHumanApproval: false, requiresPayment: false, description: "Collecte generale des diagnostics autorises." },
  read_smart: { category: "read_only", requiresHumanApproval: false, requiresPayment: false, description: "Lecture SMART sans ecriture disque." },
  read_event_logs: { category: "read_only", requiresHumanApproval: false, requiresPayment: false, description: "Lecture des journaux systeme." },
  read_cloud_metadata: { category: "read_only", requiresHumanApproval: false, requiresPayment: false, description: "Lecture des metadonnees cloud autorisees." },
  read_outlook_profile: { category: "read_only", requiresHumanApproval: false, requiresPayment: false, description: "Lecture du profil Outlook et des archives detectees." },
  mount_volume: { category: "safe_repair", requiresHumanApproval: false, requiresPayment: true, description: "Montage non destructif d'un volume existant." },
  assign_drive_letter: { category: "safe_repair", requiresHumanApproval: false, requiresPayment: true, description: "Assignation non destructive d'une lettre de lecteur." },
  restart_sync_service: { category: "safe_repair", requiresHumanApproval: false, requiresPayment: true, description: "Relance d'un service de synchronisation cloud." },
  reindex_outlook: { category: "safe_repair", requiresHumanApproval: false, requiresPayment: true, description: "Reindexation Outlook sans suppression de donnees." },
  recover_to_external_destination: { category: "safe_repair", requiresHumanApproval: true, requiresPayment: true, description: "Recuperation vers une destination externe validee." },
  format: { category: "dangerous", requiresHumanApproval: true, requiresPayment: true, description: "Formatage interdit par RemoteFix automatise." },
  chkdsk_write: { category: "dangerous", requiresHumanApproval: true, requiresPayment: true, description: "CHKDSK avec ecriture interdit automatiquement." },
  partition_write: { category: "dangerous", requiresHumanApproval: true, requiresPayment: true, description: "Ecriture de partition interdite automatiquement." },
  raid_rebuild: { category: "dangerous", requiresHumanApproval: true, requiresPayment: true, description: "Reconstruction RAID interdite automatiquement." },
  delete_files: { category: "dangerous", requiresHumanApproval: true, requiresPayment: true, description: "Suppression de fichiers interdite automatiquement." },
  overwrite_cloud_versions: { category: "dangerous", requiresHumanApproval: true, requiresPayment: true, description: "Ecrasement de versions cloud interdit automatiquement." },
  restore_to_same_disk: { category: "dangerous", requiresHumanApproval: true, requiresPayment: true, description: "Restauration sur le meme disque interdite automatiquement." },
  firmware_reset: { category: "dangerous", requiresHumanApproval: true, requiresPayment: true, description: "Reset firmware interdit automatiquement." }
};

const urgencyMultiplier = {
  standard: 1,
  priority: 1.25,
  emergency: 1.6
};

const rolePermissions = {
  owner: ["*"],
  admin: ["cases.read", "cases.write", "sessions.create", "commands.create", "commands.read", "payments.create", "audit.read"],
  technician: ["cases.read", "diagnostics.read", "diagnostics.write", "commands.create_read_only", "commands.read", "audit.read"],
  support: ["cases.read", "cases.write_basic", "sessions.create", "emails.send"],
  viewer: ["cases.read", "audit.read"]
};

export const hasRemoteFixPermission = (role, permission) => {
  const permissions = rolePermissions[role] || [];
  return permissions.includes("*") || permissions.includes(permission);
};

export const getRemoteFixStaffRole = (request, env) => {
  const hostname = new URL(request.url).hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "owner";

  const email = normalizeText(
    request.headers.get("Cf-Access-Authenticated-User-Email") || request.headers.get("cf-access-authenticated-user-email"),
    160
  ).toLowerCase();
  const roleMapText = normalizeMultilineText(env?.OPS_ACCESS_ROLE_MAP, 4000);
  const defaultRole = normalizeText(env?.OPS_DEFAULT_ROLE, 40).toLowerCase() || "viewer";

  if (!email) return defaultRole;

  try {
    const roleMap = roleMapText ? JSON.parse(roleMapText) : {};
    const mapped = normalizeText(roleMap[email], 40).toLowerCase();
    return rolePermissions[mapped] ? mapped : defaultRole;
  } catch {
    return defaultRole;
  }
};

export const requireRemoteFixPermission = (request, env, permission) => {
  const role = getRemoteFixStaffRole(request, env);
  return {
    ok: hasRemoteFixPermission(role, permission),
    role,
    actor: normalizeText(
      request.headers.get("Cf-Access-Authenticated-User-Email") || request.headers.get("cf-access-authenticated-user-email"),
      160
    ).toLowerCase() || "local-dev"
  };
};

const boolishSchema = z.union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("on"), z.literal("1"), z.literal("0")])
  .transform((value) => value === true || value === "true" || value === "on" || value === "1");

export const remoteFixCaseSchema = z.object({
  client: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
    phone: z.string().trim().max(40).optional().default(""),
    type: z.enum(clientTypes).default("individual")
  }),
  intake: z.object({
    deviceType: z.enum(deviceTypes),
    systemType: z.enum(systemTypes).default("unknown"),
    symptom: z.enum(symptoms),
    urgency: z.enum(urgencyLevels),
    problemStartedAt: z.string().trim().max(120).optional().default(""),
    containsCriticalData: boolishSchema.default(false),
    attemptedFix: boolishSchema.default(false),
    legalMatter: boolishSchema.default(false),
    notes: z.string().trim().max(4000).optional().default("")
  }),
  idempotencyKey: z.string().trim().min(16).max(128)
});

export const remoteFixConsentSchema = z.object({
  caseId: z.string().trim().min(6).max(40),
  sessionId: z.string().trim().min(6).max(40),
  token: z.string().trim().min(32).max(128),
  acceptedTermsVersion: z.string().trim().min(5).max(80).default(remoteFixConfig.termsVersion),
  accepted: boolishSchema.default(false)
}).refine((value) => value.accepted, { message: "Consentement requis." });

export const agentDiagnosticSchema = z.object({
  caseId: z.string().trim().min(6).max(40),
  sessionId: z.string().trim().min(6).max(40),
  sessionToken: z.string().trim().min(32).max(128),
  agentVersion: z.string().trim().min(3).max(40).default("simulated-browser-0.1"),
  platform: z.enum(["windows", "macos", "linux", "browser_simulated"]).default("browser_simulated"),
  diagnostics: z.object({
    disks: z.array(z.object({
      model: z.string().max(120).optional(),
      serial: z.string().max(120).optional(),
      sizeGb: z.number().nonnegative().max(100000).optional(),
      smartStatus: z.enum(["passed", "warning", "failed", "unknown"]).default("unknown"),
      isDetected: z.boolean().default(true),
      hasMountPoint: z.boolean().optional(),
      fileSystem: z.string().max(40).optional(),
      isReadOnly: z.boolean().optional()
    })).optional(),
    cloud: z.object({
      provider: z.enum(["onedrive", "google_drive", "dropbox", "icloud"]).optional(),
      syncStatus: z.enum(["healthy", "stuck", "conflict", "unknown"]).optional(),
      deletedItemsFound: z.number().int().nonnegative().optional(),
      previousVersionsFound: z.number().int().nonnegative().optional()
    }).optional(),
    outlook: z.object({
      profileDetected: z.boolean().optional(),
      pstFilesFound: z.number().int().nonnegative().optional(),
      ostFilesFound: z.number().int().nonnegative().optional(),
      indexingHealthy: z.boolean().optional()
    }).optional(),
    system: z.object({
      freeSpaceGb: z.number().nonnegative().optional(),
      criticalEventsLast24h: z.number().int().nonnegative().optional(),
      malwareIndicators: z.number().int().nonnegative().optional(),
      ransomwareExtensionsDetected: z.array(z.string().max(24)).optional()
    }).optional()
  }).default({})
});

export const commandRequestSchema = z.object({
  caseId: z.string().trim().min(6).max(40),
  sessionId: z.string().trim().min(6).max(40),
  action: z.enum(remoteActions),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
  paymentAuthorized: boolishSchema.default(false)
});

const toHex = (buffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");

export const sha256Hex = async (value) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(digest);
};

const getRemoteSecret = (env, name = "REMOTE_SESSION_SECRET") => {
  const secret = normalizeText(env?.[name], 256) || normalizeText(env?.ACCESS_CODE_SECRET, 256);
  if (!secret) throw new Error(`${name} ou ACCESS_CODE_SECRET doit etre configure.`);
  return secret;
};

export const hashRemoteToken = async (env, token) => sha256Hex(`${getRemoteSecret(env)}:${token}`);

export const generateRemoteId = (prefix) => `${prefix}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

export const generateRemoteToken = (length = 48) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};

export const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

export const stableStringify = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
};

export const createRequestHash = async (value) => sha256Hex(stableStringify(value));

export const getIdempotentResponse = async (env, key, route, requestHash) => {
  const sql = getDb(env);
  const rows = await sql`SELECT request_hash, response_body, status_code
    FROM remotefix_idempotency_keys
    WHERE key = ${key} AND route = ${route}
    LIMIT 1`;
  const row = rows[0];
  if (!row) return null;
  if (row.request_hash !== requestHash) {
    return { conflict: true };
  }
  return {
    statusCode: row.status_code || 200,
    body: typeof row.response_body === "string" ? JSON.parse(row.response_body) : row.response_body
  };
};

export const storeIdempotentResponse = async (env, key, route, requestHash, responseBody, statusCode = 200) => {
  const sql = getDb(env);
  await sql`INSERT INTO remotefix_idempotency_keys (key, route, request_hash, response_body, status_code)
    VALUES (${key}, ${route}, ${requestHash}, ${JSON.stringify(responseBody)}, ${statusCode})
    ON CONFLICT (key) DO NOTHING`;
};

export const enforceActionPolicy = (action) => {
  const policy = actionPolicy[action];
  if (!policy) return { allowedByPolicy: false, reason: "Action inconnue." };
  if (policy.category === "dangerous") return { allowedByPolicy: false, reason: `Action interdite par RemoteFix: ${policy.description}` };
  return { allowedByPolicy: true, reason: policy.description };
};

const remoteFixRules = [
  {
    id: "mechanical-drive-no-remote",
    when: ({ symptom }) => symptom === "clicking_drive",
    output: {
      service: "Laboratoire recuperation physique",
      remoteEligible: false,
      autoRepairAllowedBase: false,
      riskScoreBase: 95,
      priceMinCents: 64900,
      priceMaxCents: 280000,
      reason: "Un disque qui clique peut indiquer une panne mecanique. Toute tentative logicielle peut aggraver les dommages.",
      nextAction: "Arreter le media et creer un dossier laboratoire.",
      allowedActions: [],
      blockedActions: ["read_smart", "mount_volume", "assign_drive_letter", "format", "chkdsk_write", "partition_write"]
    }
  },
  {
    id: "ssd-not-detected-lab",
    when: ({ symptom }) => symptom === "ssd_not_detected",
    output: {
      service: "Diagnostic SSD avance laboratoire",
      remoteEligible: false,
      autoRepairAllowedBase: false,
      riskScoreBase: 88,
      priceMinCents: 90000,
      priceMaxCents: 280000,
      reason: "Un SSD non detecte peut indiquer une panne controleur, firmware ou electronique.",
      nextAction: "Ne plus brancher le SSD et preparer l'envoi laboratoire.",
      allowedActions: [],
      blockedActions: ["firmware_reset", "format", "partition_write", "chkdsk_write"]
    }
  },
  {
    id: "nas-raid-triage-only",
    when: ({ deviceType, symptom }) => deviceType === "nas_server" || symptom === "nas_raid_warning",
    output: {
      service: "NEXURA Server Triage",
      remoteEligible: true,
      autoRepairAllowedBase: false,
      riskScoreBase: 78,
      priceMinCents: 39900,
      priceMaxCents: 120000,
      reason: "Un NAS/RAID ne doit jamais etre reconstruit automatiquement. Le diagnostic a distance reste en lecture seule.",
      nextAction: "Collecter logs, etat RAID et etat des disques sans reconstruction.",
      allowedActions: ["read_diagnostics", "read_smart", "read_event_logs"],
      blockedActions: ["raid_rebuild", "partition_write", "format", "delete_files"]
    }
  },
  {
    id: "ransomware-first-response",
    when: ({ deviceType, symptom }) => deviceType === "ransomware" || symptom === "encrypted_files",
    output: {
      service: "NEXURA Ransomware First Response",
      remoteEligible: true,
      autoRepairAllowedBase: false,
      riskScoreBase: 92,
      priceMinCents: 49900,
      priceMaxCents: 250000,
      reason: "Un incident ransomware exige confinement, collecte d'indicateurs et verification des sauvegardes. Aucun dechiffrement automatique non valide.",
      nextAction: "Isoler la machine, collecter les indicateurs et verifier les sauvegardes.",
      allowedActions: ["read_diagnostics", "read_event_logs"],
      blockedActions: ["delete_files", "format", "overwrite_cloud_versions"]
    }
  },
  {
    id: "cloud-rescue",
    when: ({ deviceType, symptom }) => deviceType === "cloud" || symptom === "cloud_sync_stuck",
    output: {
      service: "NEXURA CloudRescue",
      remoteEligible: true,
      autoRepairAllowedBase: true,
      riskScoreBase: 18,
      priceMinCents: 14900,
      priceMaxCents: 39900,
      reason: "Les problemes cloud peuvent souvent etre qualifies par corbeille, versions precedentes, conflits ou relance de synchronisation.",
      nextAction: "Verifier synchronisation, versions precedentes, corbeille et conflits.",
      allowedActions: ["read_cloud_metadata", "restart_sync_service"],
      blockedActions: ["overwrite_cloud_versions", "delete_files"]
    }
  },
  {
    id: "outlook-rescue",
    when: ({ deviceType, symptom }) => deviceType === "outlook" || symptom === "outlook_missing_mail",
    output: {
      service: "NEXURA OutlookRescue",
      remoteEligible: true,
      autoRepairAllowedBase: true,
      riskScoreBase: 22,
      priceMinCents: 19900,
      priceMaxCents: 49900,
      reason: "Les problemes Outlook sont souvent lies au profil, a l'indexation, a la synchronisation ou aux archives PST/OST.",
      nextAction: "Verifier profil, indexation, archives et synchronisation Microsoft 365.",
      allowedActions: ["read_outlook_profile", "reindex_outlook"],
      blockedActions: ["delete_files"]
    }
  },
  {
    id: "diskfix-mount-repair",
    when: ({ symptom }) => symptom === "drive_detected_inaccessible",
    output: {
      service: "NEXURA DiskFix",
      remoteEligible: true,
      autoRepairAllowedBase: true,
      riskScoreBase: 34,
      priceMinCents: 9900,
      priceMaxCents: 14900,
      reason: "Un disque detecte mais inaccessible peut etre lie a une lettre manquante, un montage defaillant ou un conflit logique.",
      nextAction: "Collecter l'etat disque et ne tenter que des corrections non destructives.",
      allowedActions: ["read_diagnostics", "read_smart", "mount_volume", "assign_drive_letter"],
      blockedActions: ["format", "chkdsk_write", "partition_write"]
    }
  },
  {
    id: "safe-scan-format-prompt",
    when: ({ symptom }) => symptom === "format_prompt",
    output: {
      service: "NEXURA USB/SD SafeScan",
      remoteEligible: true,
      autoRepairAllowedBase: false,
      riskScoreBase: 56,
      priceMinCents: 7900,
      priceMaxCents: 19900,
      reason: "Une demande de formatage peut indiquer un volume RAW ou une corruption. Le scan doit rester en lecture seule.",
      nextAction: "Bloquer toute ecriture et lancer un scan lecture seule.",
      allowedActions: ["read_diagnostics", "read_smart"],
      blockedActions: ["format", "chkdsk_write", "partition_write"]
    }
  },
  {
    id: "deleted-files-rescue",
    when: ({ symptom }) => symptom === "deleted_files",
    output: {
      service: "NEXURA FileRescue Online",
      remoteEligible: true,
      autoRepairAllowedBase: true,
      riskScoreBase: 42,
      priceMinCents: 9900,
      priceMaxCents: 29900,
      reason: "Des fichiers supprimes recemment peuvent etre recuperables si aucune nouvelle ecriture ne les a ecrases.",
      nextAction: "Scanner en lecture seule et restaurer uniquement vers un autre media.",
      allowedActions: ["read_diagnostics", "recover_to_external_destination"],
      blockedActions: ["restore_to_same_disk", "format", "delete_files"]
    }
  },
  {
    id: "system-health-repair",
    when: ({ symptom }) => symptom === "system_slow_errors",
    output: {
      service: "NEXURA System Health Repair",
      remoteEligible: true,
      autoRepairAllowedBase: true,
      riskScoreBase: 28,
      priceMinCents: 9900,
      priceMaxCents: 24900,
      reason: "Un systeme lent peut etre diagnostique par journaux, sante disque, espace libre et services systeme.",
      nextAction: "Collecter journaux et appliquer des corrections securisees seulement si le disque est sain.",
      allowedActions: ["read_diagnostics", "read_smart", "read_event_logs"],
      blockedActions: ["format", "delete_files", "partition_write"]
    }
  }
];

const fallbackRule = {
  id: "fallback-guided-diagnostic",
  output: {
    service: "NEXURA Diagnostic Remote",
    remoteEligible: true,
    autoRepairAllowedBase: false,
    riskScoreBase: 50,
    priceMinCents: 4900,
    priceMaxCents: 14900,
    reason: "Le probleme n'est pas assez precis. Un diagnostic guide est requis avant toute correction.",
    nextAction: "Collecter les informations systeme et recommander la prochaine etape.",
    allowedActions: ["read_diagnostics"],
    blockedActions: ["format", "delete_files", "partition_write"]
  }
};

const clampRisk = (score) => Math.max(0, Math.min(100, score));

export const riskLabel = (score) => {
  if (score >= 85) return "Critique";
  if (score >= 70) return "Eleve";
  if (score >= 50) return "Moyen-eleve";
  if (score >= 30) return "Moyen";
  return "Faible";
};

export const classifyRemoteFixCase = (caseId, client, intake) => {
  const selected = remoteFixRules.find((rule) => rule.when({ ...intake, clientType: client.type })) || fallbackRule;
  let score = selected.output.riskScoreBase;
  if (intake.containsCriticalData) score += 8;
  if (intake.attemptedFix) score += 10;
  if (intake.legalMatter || client.type === "lawyer" || client.type === "insurance") score += 12;
  if (intake.urgency === "emergency") score += 5;
  score = clampRisk(score);

  const multiplier = urgencyMultiplier[intake.urgency] || 1;
  const autoRepairAllowed = selected.output.autoRepairAllowedBase && score <= remoteFixConfig.maxAutoRepairRisk;
  const policyAnswers = answerDecisionQuestions({ client, intake, selected, score, autoRepairAllowed });
  const finalDecision = decideRemoteFixOutcome(policyAnswers, selected.output.remoteEligible, autoRepairAllowed, score);

  return {
    caseId,
    matchedRule: selected.id,
    service: selected.output.service,
    finalDecision,
    issueType: policyAnswers.issueType,
    mediaUnstable: policyAnswers.mediaUnstable,
    remoteWriteRisk: policyAnswers.remoteWriteRisk,
    attemptedFix: policyAnswers.attemptedFix,
    legalOrCritical: policyAnswers.legalOrCritical,
    monetizationPath: policyAnswers.monetizationPath,
    remoteEligible: selected.output.remoteEligible,
    autoRepairAllowed,
    requiresLab: finalDecision === "LAB_REQUIRED",
    riskScore: score,
    riskLabel: riskLabel(score),
    priceMinCents: Math.round(selected.output.priceMinCents * multiplier),
    priceMaxCents: Math.round(selected.output.priceMaxCents * multiplier),
    reason: selected.output.reason,
    nextAction: selected.output.nextAction,
    allowedActions: autoRepairAllowed
      ? selected.output.allowedActions
      : selected.output.allowedActions.filter((action) => action.startsWith("read_")),
    blockedActions: selected.output.blockedActions
  };
};

export const answerDecisionQuestions = ({ client, intake, selected, score, autoRepairAllowed }) => {
  const physicalSymptoms = new Set(["clicking_drive", "ssd_not_detected"]);
  const cloudSymptoms = new Set(["cloud_sync_stuck", "outlook_missing_mail"]);
  const serverSymptoms = new Set(["nas_raid_warning"]);
  const issueType = physicalSymptoms.has(intake.symptom)
    ? "physical"
    : cloudSymptoms.has(intake.symptom) || intake.deviceType === "cloud" || intake.deviceType === "outlook"
      ? "cloud_or_app"
      : serverSymptoms.has(intake.symptom) || intake.deviceType === "nas_server"
        ? "infrastructure"
        : "logical_or_software";
  const mediaUnstable = physicalSymptoms.has(intake.symptom) || intake.symptom === "nas_raid_warning" || selected.output.riskScoreBase >= 78;
  const remoteWriteRisk = selected.output.allowedActions.some((action) => actionPolicy[action]?.category === "dangerous") || ["format_prompt", "nas_raid_warning", "encrypted_files"].includes(intake.symptom);
  const legalOrCritical = Boolean(intake.legalMatter || intake.containsCriticalData || client.type === "lawyer" || client.type === "insurance");
  const monetizationPath = !selected.output.remoteEligible
    ? "laboratory_quote"
    : autoRepairAllowed
      ? "remote_repair_payment"
      : score >= 70 || legalOrCritical
        ? "human_review_or_lab"
        : "remote_diagnostic_payment";

  return {
    issueType,
    mediaUnstable,
    remoteWriteRisk,
    attemptedFix: Boolean(intake.attemptedFix),
    legalOrCritical,
    monetizationPath
  };
};

export const decideRemoteFixOutcome = (answers, remoteEligible, autoRepairAllowed, score) => {
  if (!remoteEligible || answers.mediaUnstable || answers.issueType === "physical") return "LAB_REQUIRED";
  if (answers.legalOrCritical && score >= 70) return "HUMAN_REVIEW_REQUIRED";
  if (autoRepairAllowed && !answers.remoteWriteRisk) return "REMOTE_REPAIR";
  return "REMOTE_DIAGNOSTIC_ONLY";
};

export const mapRemoteFixToCaseSubmission = (client, intake, requestPath = "/remotefix.html") => {
  const supportByDevice = {
    external_drive: "HDD",
    ssd_nvme: "SSD / NVMe",
    windows_pc: "Je ne sais pas",
    mac: "Je ne sais pas",
    linux: "Je ne sais pas",
    cloud: "Je ne sais pas",
    outlook: "Je ne sais pas",
    nas_server: "RAID / NAS / serveur",
    phone: "Téléphone",
    ransomware: "Dossier légal / forensique"
  };
  const symptomByRemote = {
    deleted_files: "fichiers supprimés",
    format_prompt: "formaté",
    drive_detected_inaccessible: "non détecté",
    ssd_not_detected: "non détecté",
    clicking_drive: "bruit / clic",
    encrypted_files: "ransomware / chiffré",
    nas_raid_warning: "plusieurs disques défaillants"
  };
  const urgencyByRemote = {
    standard: "Standard",
    priority: "Priorité",
    emergency: "Urgence 24–48 h"
  };
  const profileByClient = {
    individual: "Particulier",
    business: "Entreprise",
    lawyer: "Avocat",
    insurance: "Assureur"
  };
  const notes = normalizeMultilineText(intake.notes, 2200);
  const message = [
    `Module: NEXURA RemoteFix`,
    `Appareil: ${intake.deviceType}`,
    `Systeme: ${intake.systemType}`,
    `Probleme: ${intake.symptom}`,
    intake.problemStartedAt ? `Depuis: ${intake.problemStartedAt}` : "",
    `Tentative deja faite: ${intake.attemptedFix ? "oui" : "non"}`,
    `Donnees critiques: ${intake.containsCriticalData ? "oui" : "non"}`,
    `Contexte legal: ${intake.legalMatter ? "oui" : "non"}`,
    notes ? `Notes:\n${notes}` : ""
  ].filter(Boolean).join("\n");

  return {
    nom: client.name,
    courriel: client.email,
    telephone: client.phone || "",
    ville: "",
    preferenceContact: "email",
    support: supportByDevice[intake.deviceType] || "Je ne sais pas",
    symptome: symptomByRemote[intake.symptom] || "non détecté",
    urgence: urgencyByRemote[intake.urgency] || "Standard",
    profil: profileByClient[client.type] || "Particulier",
    impact: intake.urgency === "emergency" ? "Opérations bloquées" : intake.containsCriticalData ? "Données importantes" : "Planifié / non urgent",
    sensibilite: intake.legalMatter || client.type === "lawyer" || intake.symptom === "encrypted_files" ? "Preuve / chaîne de possession" : intake.containsCriticalData ? "Confidentiel" : "Standard",
    message,
    sourcePath: requestPath,
    consentement: true,
    website: ""
  };
};

export const recordRemoteFixAudit = async (env, caseId, actor, event, metadata = {}) => {
  const sql = getDb(env);
  const id = generateRemoteId("LOG");
  await sql`INSERT INTO remotefix_audit_logs (id, case_id, actor, event, metadata)
    VALUES (${id}, ${caseId}, ${normalizeText(actor, 80) || "system"}, ${normalizeText(event, 120)}, ${JSON.stringify(metadata)})`;
  return { id, caseId, actor, event, metadata };
};

export const storeRemoteFixTriage = async (env, triage) => {
  const sql = getDb(env);
  await sql`INSERT INTO remotefix_triage_results (
    case_id, matched_rule, service, final_decision, issue_type,
    media_unstable, remote_write_risk, attempted_fix, legal_or_critical,
    monetization_path, remote_eligible, auto_repair_allowed,
    requires_lab, risk_score, risk_label, price_min_cents, price_max_cents,
    reason, next_action, allowed_actions, blocked_actions
  ) VALUES (
    ${triage.caseId}, ${triage.matchedRule}, ${triage.service}, ${triage.finalDecision}, ${triage.issueType},
    ${triage.mediaUnstable}, ${triage.remoteWriteRisk}, ${triage.attemptedFix}, ${triage.legalOrCritical},
    ${triage.monetizationPath}, ${triage.remoteEligible}, ${triage.autoRepairAllowed},
    ${triage.requiresLab}, ${triage.riskScore}, ${triage.riskLabel}, ${triage.priceMinCents}, ${triage.priceMaxCents},
    ${triage.reason}, ${triage.nextAction}, ${JSON.stringify(triage.allowedActions)}, ${JSON.stringify(triage.blockedActions)}
  )`;
};

export const getRemoteFixTriage = async (env, caseId) => {
  const sql = getDb(env);
  const rows = await sql`SELECT * FROM remotefix_triage_results
    WHERE case_id = ${normalizeCaseId(caseId)}
    ORDER BY created_at DESC
    LIMIT 1`;
  const row = rows[0];
  if (!row) return null;
  return {
    caseId: row.case_id,
    matchedRule: row.matched_rule,
    service: row.service,
    finalDecision: row.final_decision,
    issueType: row.issue_type,
    mediaUnstable: Boolean(row.media_unstable),
    remoteWriteRisk: Boolean(row.remote_write_risk),
    attemptedFix: Boolean(row.attempted_fix),
    legalOrCritical: Boolean(row.legal_or_critical),
    monetizationPath: row.monetization_path,
    remoteEligible: Boolean(row.remote_eligible),
    autoRepairAllowed: Boolean(row.auto_repair_allowed),
    requiresLab: Boolean(row.requires_lab),
    riskScore: Number(row.risk_score || 0),
    riskLabel: row.risk_label,
    priceMinCents: Number(row.price_min_cents || 0),
    priceMaxCents: Number(row.price_max_cents || 0),
    reason: row.reason,
    nextAction: row.next_action,
    allowedActions: row.allowed_actions || [],
    blockedActions: row.blocked_actions || []
  };
};

export const createRemoteFixSession = async (env, caseId, triage, requestUrl) => {
  const sql = getDb(env);
  const rawToken = generateRemoteToken();
  const tokenHash = await hashRemoteToken(env, rawToken);
  const now = new Date();
  const sessionId = generateRemoteId("RS");
  const expiresAt = addMinutes(now, remoteFixConfig.tokenTtlMinutes).toISOString();
  const publicUrl = `${getPublicOrigin(env, requestUrl)}/remotefix.html?caseId=${encodeURIComponent(caseId)}&sessionId=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(rawToken)}`;

  await sql`INSERT INTO remotefix_sessions (
    id, case_id, token_hash, public_url, status, allowed_actions, expires_at, created_at, updated_at
  ) VALUES (
    ${sessionId}, ${caseId}, ${tokenHash}, ${publicUrl}, 'waiting_for_consent', ${JSON.stringify(triage.allowedActions)}, ${expiresAt}, NOW(), NOW()
  )`;

  await recordRemoteFixAudit(env, caseId, "system", "remote_session_created", {
    sessionId,
    expiresAt,
    allowedActions: triage.allowedActions
  });

  return {
    id: sessionId,
    caseId,
    publicUrl,
    status: "waiting_for_consent",
    allowedActions: triage.allowedActions,
    expiresAt,
    rawToken
  };
};

export const getRemoteFixSession = async (env, caseId, sessionId) => {
  const sql = getDb(env);
  const rows = await sql`SELECT * FROM remotefix_sessions
    WHERE case_id = ${normalizeCaseId(caseId)} AND id = ${normalizeText(sessionId, 40)}
    LIMIT 1`;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    caseId: row.case_id,
    tokenHash: row.token_hash,
    publicUrl: row.public_url,
    status: row.status,
    allowedActions: row.allowed_actions || [],
    expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : `${row.expires_at}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

export const verifyRemoteFixSessionToken = async (env, session, rawToken) => {
  if (!session) return false;
  if (["expired", "revoked"].includes(session.status)) return false;
  if (new Date(session.expiresAt).getTime() < Date.now()) return false;
  const tokenHash = await hashRemoteToken(env, rawToken);
  return tokenHash === session.tokenHash;
};

export const getVerifiedRemoteFixSession = async (env, input) => {
  const session = await getRemoteFixSession(env, input.caseId, input.sessionId);
  const valid = await verifyRemoteFixSessionToken(env, session, input.token || input.sessionToken);
  if (!valid) throw new Error("Lien RemoteFix invalide ou expire.");
  return session;
};

export const sendRemoteFixSessionEmail = async (env, client, caseId, triage, session) => {
  const subject = triage.remoteEligible
    ? `Diagnostic a distance securise - dossier ${caseId}`
    : `Action requise pour proteger vos donnees - dossier ${caseId}`;
  const price = `${formatCurrency(triage.priceMinCents)} - ${formatCurrency(triage.priceMaxCents)}`;
  const text = [
    `Bonjour ${client.name},`,
    "",
    "Nous avons analyse votre demande RemoteFix.",
    `Dossier: ${caseId}`,
    `Service recommande: ${triage.service}`,
    `Risque: ${triage.riskLabel} (${triage.riskScore}/100)`,
    `Estimation: ${price}`,
    "",
    triage.reason,
    "",
    `Prochaine action: ${triage.nextAction}`,
    `Lien securise temporaire: ${session.publicUrl}`,
    "",
    "Important: ne formatez pas, ne reinstallez rien et ne copiez rien sur le media concerne.",
    "Le lien exige votre consentement avant tout diagnostic.",
    "",
    "NEXURADATA"
  ].join("\n");
  const html = `<p>Bonjour ${escapeHtml(client.name)},</p><p>Nous avons analyse votre demande RemoteFix.</p><p><strong>Dossier:</strong> ${escapeHtml(caseId)}<br><strong>Service:</strong> ${escapeHtml(triage.service)}<br><strong>Risque:</strong> ${escapeHtml(triage.riskLabel)} (${triage.riskScore}/100)<br><strong>Estimation:</strong> ${escapeHtml(price)}</p><p>${escapeHtml(triage.reason)}</p><p>${escapeHtml(triage.nextAction)}</p><p><a href="${escapeHtml(session.publicUrl)}">Ouvrir le lien securise</a></p><p>Ne formatez pas, ne reinstallez rien et ne copiez rien sur le media concerne.</p>`;
  const delivery = await sendResendEmail(env, { to: [client.email], subject, text, html }, `remotefix-session-${caseId}-${session.id}`);
  const status = delivery.sent ? "sent" : "simulated";
  const providerMessageId = normalizeText(delivery.id, 120);
  const sql = getDb(env);
  await sql`INSERT INTO remotefix_email_logs (id, case_id, recipient, subject, provider_message_id, status)
    VALUES (${generateRemoteId("EML")}, ${caseId}, ${client.email}, ${subject}, ${providerMessageId}, ${status})`;
  await recordRemoteFixAudit(env, caseId, "system", status === "sent" ? "remote_email_sent" : "remote_email_simulated", {
    sessionId: session.id,
    recipient: client.email,
    reason: delivery.reason || "sent"
  });
  return { ...delivery, status, subject, preview: text };
};

export const createRemoteFixCase = async (env, payload, requestUrl) => {
  const parsed = remoteFixCaseSchema.parse(payload);
  const route = "POST /api/remotefix/cases";
  const requestHash = await createRequestHash(parsed);
  const cached = await getIdempotentResponse(env, parsed.idempotencyKey, route, requestHash);
  if (cached?.conflict) return { conflict: true };
  if (cached) return { cached: true, response: cached.body, statusCode: cached.statusCode };

  const requestPath = new URL(requestUrl).pathname || "/remotefix.html";
  const submission = mapRemoteFixToCaseSubmission(parsed.client, parsed.intake, requestPath);
  const caseRecord = await createCase(env, submission);
  const triage = classifyRemoteFixCase(caseRecord.caseId, parsed.client, parsed.intake);
  await storeRemoteFixTriage(env, triage);
  const session = await createRemoteFixSession(env, caseRecord.caseId, triage, requestUrl);
  const email = await sendRemoteFixSessionEmail(env, parsed.client, caseRecord.caseId, triage, session);

  await recordCaseEvent(env, caseRecord.caseId, "nexura-remotefix", "RemoteFix triage complete", `${triage.service} · ${triage.riskLabel} · ${triage.nextAction}`);
  await recordRemoteFixAudit(env, caseRecord.caseId, "system", "case_created_and_triaged", {
    matchedRule: triage.matchedRule,
    service: triage.service,
    remoteEligible: triage.remoteEligible,
    autoRepairAllowed: triage.autoRepairAllowed,
    requiresLab: triage.requiresLab
  });

  const response = {
    ok: true,
    caseId: caseRecord.caseId,
    status: "triage_completed",
    triage: publicTriage(triage),
    session: publicSession(session),
    email: {
      status: email.status,
      sent: Boolean(email.sent),
      reason: email.reason || "sent",
      subject: email.subject,
      preview: email.preview
    }
  };

  await storeIdempotentResponse(env, parsed.idempotencyKey, route, requestHash, response, 200);
  return { response, statusCode: 200 };
};

export const publicTriage = (triage) => ({
  matchedRule: triage.matchedRule,
  service: triage.service,
  finalDecision: triage.finalDecision,
  issueType: triage.issueType,
  mediaUnstable: triage.mediaUnstable,
  remoteWriteRisk: triage.remoteWriteRisk,
  attemptedFix: triage.attemptedFix,
  legalOrCritical: triage.legalOrCritical,
  monetizationPath: triage.monetizationPath,
  remoteEligible: triage.remoteEligible,
  autoRepairAllowed: triage.autoRepairAllowed,
  requiresLab: triage.requiresLab,
  decision: triage.finalDecision === "LAB_REQUIRED"
    ? "laboratoire requis"
    : triage.finalDecision === "HUMAN_REVIEW_REQUIRED"
      ? "revue humaine requise"
      : triage.finalDecision === "REMOTE_REPAIR"
        ? "reparable a distance"
        : "diagnostic a distance seulement",
  riskScore: triage.riskScore,
  riskLabel: triage.riskLabel,
  priceMinCents: triage.priceMinCents,
  priceMaxCents: triage.priceMaxCents,
  priceRange: `${formatCurrency(triage.priceMinCents)} - ${formatCurrency(triage.priceMaxCents)}`,
  reason: triage.reason,
  nextAction: triage.nextAction,
  allowedActions: triage.allowedActions,
  blockedActions: triage.blockedActions
});

export const publicSession = (session) => ({
  id: session.id,
  caseId: session.caseId,
  publicUrl: session.publicUrl,
  status: session.status,
  expiresAt: session.expiresAt,
  allowedActions: session.allowedActions
});

export const giveRemoteFixConsent = async (env, payload, request) => {
  const parsed = remoteFixConsentSchema.parse(payload);
  const session = await getVerifiedRemoteFixSession(env, parsed);
  const sql = getDb(env);
  const consentId = generateRemoteId("CON");
  const ipAddress = normalizeText(request.headers.get("CF-Connecting-IP"), 80);
  const userAgent = normalizeText(request.headers.get("user-agent"), 300);

  await sql`INSERT INTO remotefix_consents (
    id, case_id, session_id, client_email, ip_address, user_agent, accepted_terms_version
  ) SELECT ${consentId}, c.case_id, ${session.id}, c.email, ${ipAddress}, ${userAgent}, ${parsed.acceptedTermsVersion}
    FROM cases c WHERE c.case_id = ${session.caseId}`;
  await sql`UPDATE remotefix_sessions SET status = 'consent_given', updated_at = NOW()
    WHERE id = ${session.id} AND case_id = ${session.caseId}`;
  await sql`UPDATE cases SET status = 'Diagnostic en cours', next_step = 'Diagnostic RemoteFix autorise. Collecte simulee en lecture seule.', updated_at = NOW()
    WHERE case_id = ${session.caseId}`;
  await recordCaseEvent(env, session.caseId, "client", "Consentement RemoteFix donne", `Conditions ${parsed.acceptedTermsVersion} acceptees pour la session ${session.id}.`);
  await recordRemoteFixAudit(env, session.caseId, "client", "remote_consent_given", {
    sessionId: session.id,
    consentId,
    termsVersion: parsed.acceptedTermsVersion,
    ipAddress
  });

  return { ok: true, consentId, session: { ...publicSession(session), status: "consent_given" } };
};

export const hasRemoteFixConsent = async (env, caseId, sessionId) => {
  const sql = getDb(env);
  const rows = await sql`SELECT id FROM remotefix_consents
    WHERE case_id = ${normalizeCaseId(caseId)} AND session_id = ${normalizeText(sessionId, 40)}
    LIMIT 1`;
  return Boolean(rows[0]);
};

export const analyzeRemoteFixDiagnostics = (payload, triage) => {
  const blocked = new Set(triage.blockedActions);
  const safe = new Set(triage.allowedActions);
  let severity = "low";
  const findings = [];

  for (const disk of payload.diagnostics.disks || []) {
    if (!disk.isDetected) {
      severity = "high";
      findings.push("Un disque attendu n'est pas detecte.");
      blocked.add("mount_volume");
      blocked.add("assign_drive_letter");
    }
    if (disk.smartStatus === "failed") {
      severity = "critical";
      findings.push("SMART indique une panne critique. Les corrections automatiques sont bloquees.");
      blocked.add("mount_volume");
      blocked.add("assign_drive_letter");
      blocked.add("chkdsk_write");
      safe.delete("mount_volume");
      safe.delete("assign_drive_letter");
    }
    if (disk.isDetected && !disk.hasMountPoint && disk.smartStatus !== "failed" && triage.autoRepairAllowed) {
      findings.push("Volume detecte sans point de montage. Une correction non destructive peut etre proposee par le serveur.");
      safe.add("assign_drive_letter");
      safe.add("mount_volume");
    }
  }

  if (payload.diagnostics.cloud?.syncStatus === "stuck" && triage.autoRepairAllowed) {
    findings.push("Synchronisation cloud bloquee. Relance du service possible apres autorisation serveur.");
    safe.add("restart_sync_service");
  }

  if (payload.diagnostics.outlook?.profileDetected && payload.diagnostics.outlook.indexingHealthy === false && triage.autoRepairAllowed) {
    findings.push("Profil Outlook detecte avec indexation problematique. Reindexation possible apres autorisation serveur.");
    safe.add("reindex_outlook");
  }

  const ransomwareExtensions = payload.diagnostics.system?.ransomwareExtensionsDetected || [];
  if (ransomwareExtensions.length > 0) {
    severity = "critical";
    findings.push(`Extensions ransomware detectees: ${ransomwareExtensions.join(", ")}.`);
    blocked.add("delete_files");
    blocked.add("format");
  }

  const safeActionsToOffer = Array.from(safe).filter((action) => !blocked.has(action) && enforceActionPolicy(action).allowedByPolicy);
  const blockedActions = Array.from(blocked);
  const recommendedNextStatus = severity === "critical" || severity === "high" || triage.requiresLab
    ? "lab_required"
    : safeActionsToOffer.some((action) => !action.startsWith("read_"))
      ? "remote_repair_allowed"
      : "diagnostic_completed";

  return {
    caseId: payload.caseId,
    reportId: generateRemoteId("DR"),
    severity,
    summary: findings.length ? findings.join(" ") : "Aucune anomalie critique detectee dans le diagnostic simule.",
    recommendedNextStatus,
    safeActionsToOffer,
    blockedActions
  };
};

export const receiveRemoteFixDiagnostics = async (env, payload) => {
  const parsed = agentDiagnosticSchema.parse(payload);
  const session = await getVerifiedRemoteFixSession(env, {
    caseId: parsed.caseId,
    sessionId: parsed.sessionId,
    token: parsed.sessionToken
  });
  if (!(await hasRemoteFixConsent(env, parsed.caseId, parsed.sessionId))) {
    throw new Error("Consentement RemoteFix manquant.");
  }
  const triage = await getRemoteFixTriage(env, parsed.caseId);
  if (!triage) throw new Error("Triage RemoteFix introuvable.");
  const result = analyzeRemoteFixDiagnostics(parsed, triage);
  const sql = getDb(env);
  await sql`INSERT INTO remotefix_diagnostic_reports (
    id, case_id, session_id, severity, summary, recommended_next_status,
    safe_actions_to_offer, blocked_actions, raw_payload
  ) VALUES (
    ${result.reportId}, ${parsed.caseId}, ${session.id}, ${result.severity}, ${result.summary}, ${result.recommendedNextStatus},
    ${JSON.stringify(result.safeActionsToOffer)}, ${JSON.stringify(result.blockedActions)}, ${JSON.stringify(parsed)}
  )`;
  const publicStatus = result.recommendedNextStatus === "lab_required"
    ? "En attente du média"
    : result.recommendedNextStatus === "remote_repair_allowed"
      ? "Diagnostic terminé"
      : "Diagnostic terminé";
  const nextStep = result.recommendedNextStatus === "lab_required"
    ? "Laboratoire requis. Ne plus manipuler le media avant instructions."
    : result.recommendedNextStatus === "remote_repair_allowed"
      ? "Le serveur peut proposer une commande de reparation a faible risque apres paiement/autorisation."
      : "Diagnostic termine. Aucune reparation automatique n'est lancee.";
  await sql`UPDATE cases SET status = ${publicStatus}, next_step = ${nextStep}, updated_at = NOW(), last_action = 'Diagnostic RemoteFix simule', next_action = ${nextStep}
    WHERE case_id = ${parsed.caseId}`;
  await recordCaseEvent(env, parsed.caseId, "agent", "Diagnostic RemoteFix recu", `${result.severity}: ${result.summary}`);
  await recordRemoteFixAudit(env, parsed.caseId, "agent", "agent_diagnostic_received", {
    sessionId: session.id,
    reportId: result.reportId,
    severity: result.severity,
    recommendedNextStatus: result.recommendedNextStatus,
    safeActionsToOffer: result.safeActionsToOffer,
    blockedActions: result.blockedActions
  });
  return { ok: true, result, triage: publicTriage(triage) };
};

export const canExecuteRemoteAction = ({ action, triage, diagnostic, hasConsent, hasPaymentOrFreeDiagnostic }) => {
  const policy = enforceActionPolicy(action);
  if (!policy.allowedByPolicy) return { allowed: false, reason: policy.reason };
  if (!hasConsent) return { allowed: false, reason: "Consentement manquant." };
  if (!hasPaymentOrFreeDiagnostic) return { allowed: false, reason: "Paiement ou autorisation commerciale requis." };
  if (triage.blockedActions.includes(action)) return { allowed: false, reason: "Action bloquee par le triage initial." };
  if (diagnostic.blockedActions.includes(action)) return { allowed: false, reason: "Action bloquee par le diagnostic agent." };
  if (!diagnostic.safeActionsToOffer.includes(action)) return { allowed: false, reason: "Action non offerte par le diagnostic." };
  if (triage.riskScore > remoteFixConfig.maxAutoRepairRisk) return { allowed: false, reason: "Score de risque trop eleve." };
  return { allowed: true, reason: "Action autorisee par le serveur." };
};

const hmacHex = async (secret, value) => {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toHex(digest);
};

export const signAgentCommand = async (env, commandPayload) => {
  const secret = getRemoteSecret(env, "REMOTE_COMMAND_SIGNING_SECRET");
  return hmacHex(secret, stableStringify(commandPayload));
};

export const getLatestRemoteFixDiagnostic = async (env, caseId) => {
  const sql = getDb(env);
  const rows = await sql`SELECT * FROM remotefix_diagnostic_reports
    WHERE case_id = ${normalizeCaseId(caseId)}
    ORDER BY created_at DESC
    LIMIT 1`;
  const row = rows[0];
  if (!row) return null;
  return {
    caseId: row.case_id,
    reportId: row.id,
    severity: row.severity,
    summary: row.summary,
    recommendedNextStatus: row.recommended_next_status,
    safeActionsToOffer: row.safe_actions_to_offer || [],
    blockedActions: row.blocked_actions || []
  };
};

export const createSignedAgentCommand = async (env, payload, actor = "ops") => {
  const parsed = commandRequestSchema.parse(payload);
  const triage = await getRemoteFixTriage(env, parsed.caseId);
  const diagnostic = await getLatestRemoteFixDiagnostic(env, parsed.caseId);
  const session = await getRemoteFixSession(env, parsed.caseId, parsed.sessionId);
  if (!triage || !diagnostic || !session) throw new Error("Dossier RemoteFix incomplet.");
  const hasConsent = await hasRemoteFixConsent(env, parsed.caseId, parsed.sessionId);
  const authorization = canExecuteRemoteAction({
    action: parsed.action,
    triage,
    diagnostic,
    hasConsent,
    hasPaymentOrFreeDiagnostic: parsed.paymentAuthorized || !actionPolicy[parsed.action]?.requiresPayment
  });
  if (!authorization.allowed) throw new Error(authorization.reason);

  const commandId = generateRemoteId("CMD");
  const commandPayload = {
    id: commandId,
    caseId: parsed.caseId,
    sessionId: parsed.sessionId,
    action: parsed.action,
    payload: parsed.payload,
    nonce: generateRemoteToken(24),
    expiresAt: addMinutes(new Date(), 10).toISOString()
  };
  const signature = await signAgentCommand(env, commandPayload);
  const sql = getDb(env);
  await sql`INSERT INTO remotefix_agent_commands (
    id, case_id, session_id, action, status, payload, server_signature, expires_at, created_by
  ) VALUES (
    ${commandId}, ${parsed.caseId}, ${parsed.sessionId}, ${parsed.action}, 'queued', ${JSON.stringify(commandPayload)}, ${signature}, ${commandPayload.expiresAt}, ${normalizeText(actor, 120) || "ops"}
  )`;
  await recordRemoteFixAudit(env, parsed.caseId, "operator", "agent_command_signed", {
    commandId,
    sessionId: parsed.sessionId,
    action: parsed.action,
    actor
  });
  return { ok: true, command: { ...commandPayload, status: "queued", serverSignature: signature } };
};

export const listAgentCommandsForSession = async (env, input) => {
  const session = await getVerifiedRemoteFixSession(env, input);
  if (!(await hasRemoteFixConsent(env, session.caseId, session.id))) throw new Error("Consentement RemoteFix manquant.");
  const sql = getDb(env);
  const rows = await sql`SELECT id, case_id, session_id, action, status, payload, server_signature, expires_at, created_at
    FROM remotefix_agent_commands
    WHERE case_id = ${session.caseId}
      AND session_id = ${session.id}
      AND status = 'queued'
      AND expires_at > NOW()
    ORDER BY created_at ASC`;
  await recordRemoteFixAudit(env, session.caseId, "agent", "agent_commands_polled", { sessionId: session.id, count: rows.length });
  return {
    ok: true,
    commands: rows.map((row) => ({
      id: row.id,
      caseId: row.case_id,
      sessionId: row.session_id,
      action: row.action,
      status: row.status,
      payload: row.payload,
      serverSignature: row.server_signature,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    }))
  };
};

export const computeRemoteFixDepositCents = (triage) => {
  if (!triage.remoteEligible) return 0;
  if (triage.service.includes("Ransomware")) return 49900;
  if (triage.service.includes("Server")) return 39900;
  return Math.max(4900, Math.min(triage.priceMinCents, 19900));
};

export const getRemoteFixAudit = async (env, caseId) => {
  const sql = getDb(env);
  const rows = await sql`SELECT id, actor, event, metadata, created_at
    FROM remotefix_audit_logs
    WHERE case_id = ${normalizeCaseId(caseId)}
    ORDER BY created_at DESC
    LIMIT 80`;
  return rows.map((row) => ({
    id: row.id,
    actor: row.actor,
    event: row.event,
    metadata: row.metadata || {},
    createdAt: row.created_at
  }));
};

export const listRemoteFixAdminCases = async (env, query = "") => {
  const sql = getDb(env);
  const like = normalizeText(query, 120) ? `%${normalizeText(query, 120)}%` : null;
  const rows = await sql`SELECT
    c.case_id, c.name, c.email, c.phone, c.status, c.next_step, c.updated_at,
    t.service, t.remote_eligible, t.auto_repair_allowed, t.requires_lab,
    t.risk_score, t.risk_label, t.price_min_cents, t.price_max_cents,
    s.id AS session_id, s.status AS session_status, s.expires_at,
    r.id AS report_id, r.severity, r.recommended_next_status
  FROM cases c
  JOIN LATERAL (
    SELECT * FROM remotefix_triage_results
    WHERE case_id = c.case_id
    ORDER BY created_at DESC
    LIMIT 1
  ) t ON TRUE
  LEFT JOIN LATERAL (
    SELECT id, status, expires_at FROM remotefix_sessions
    WHERE case_id = c.case_id
    ORDER BY created_at DESC
    LIMIT 1
  ) s ON TRUE
  LEFT JOIN LATERAL (
    SELECT id, severity, recommended_next_status FROM remotefix_diagnostic_reports
    WHERE case_id = c.case_id
    ORDER BY created_at DESC
    LIMIT 1
  ) r ON TRUE
  WHERE (${like}::text IS NULL OR c.case_id LIKE ${like} OR c.name ILIKE ${like} OR c.email ILIKE ${like})
  ORDER BY c.updated_at DESC
  LIMIT 80`;

  return rows.map((row) => ({
    caseId: row.case_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    nextStep: row.next_step,
    updatedAt: row.updated_at,
    triage: {
      service: row.service,
      remoteEligible: Boolean(row.remote_eligible),
      autoRepairAllowed: Boolean(row.auto_repair_allowed),
      requiresLab: Boolean(row.requires_lab),
      decision: row.requires_lab ? "laboratoire requis" : row.auto_repair_allowed ? "reparable a distance" : "diagnostic a distance seulement",
      riskScore: Number(row.risk_score || 0),
      riskLabel: row.risk_label,
      priceRange: `${formatCurrency(row.price_min_cents)} - ${formatCurrency(row.price_max_cents)}`
    },
    session: row.session_id ? { id: row.session_id, status: row.session_status, expiresAt: row.expires_at } : null,
    report: row.report_id ? { id: row.report_id, severity: row.severity, recommendedNextStatus: row.recommended_next_status } : null
  }));
};

export const getRemoteFixOverview = async (env, caseId) => {
  const detail = await getCaseDetail(env, caseId);
  if (!detail) return null;
  const triage = await getRemoteFixTriage(env, caseId);
  const diagnostic = await getLatestRemoteFixDiagnostic(env, caseId);
  const audit = await getRemoteFixAudit(env, caseId);
  const sql = getDb(env);
  const sessions = await sql`SELECT id, public_url, status, allowed_actions, expires_at, created_at
    FROM remotefix_sessions
    WHERE case_id = ${normalizeCaseId(caseId)}
    ORDER BY created_at DESC
    LIMIT 10`;
  const commands = await sql`SELECT id, session_id, action, status, payload, server_signature, expires_at, created_at, created_by
    FROM remotefix_agent_commands
    WHERE case_id = ${normalizeCaseId(caseId)}
    ORDER BY created_at DESC
    LIMIT 30`;
  return {
    case: detail,
    triage: triage ? publicTriage(triage) : null,
    diagnostic,
    sessions: sessions.map((row) => ({
      id: row.id,
      publicUrl: row.public_url,
      status: row.status,
      allowedActions: row.allowed_actions || [],
      expiresAt: row.expires_at,
      createdAt: row.created_at
    })),
    commands: commands.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      action: row.action,
      status: row.status,
      payload: row.payload,
      serverSignature: row.server_signature,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      createdBy: row.created_by
    })),
    audit
  };
};

export const getRemoteFixClientOverview = async (env, input) => {
  const session = await getVerifiedRemoteFixSession(env, input);
  const triage = await getRemoteFixTriage(env, session.caseId);
  const diagnostic = await getLatestRemoteFixDiagnostic(env, session.caseId);
  const detail = await getCaseDetail(env, session.caseId);
  return {
    ok: true,
    case: {
      caseId: detail.caseId,
      status: detail.status,
      nextStep: detail.nextStep,
      name: detail.name,
      support: detail.support,
      symptom: detail.symptom,
      payments: detail.payments || []
    },
    session: publicSession(session),
    triage: triage ? publicTriage(triage) : null,
    diagnostic,
    hasConsent: await hasRemoteFixConsent(env, session.caseId, session.id)
  };
};

export const createRemoteFixSessionForExistingCase = async (env, caseId, requestUrl) => {
  const detail = await getCaseDetail(env, caseId);
  const triage = await getRemoteFixTriage(env, caseId);
  if (!detail || !triage) throw new Error("Dossier RemoteFix introuvable.");
  const session = await createRemoteFixSession(env, detail.caseId, triage, requestUrl);
  const email = await sendRemoteFixSessionEmail(env, {
    name: detail.name,
    email: detail.email,
    phone: detail.phone,
    type: detail.clientType || "individual"
  }, detail.caseId, triage, session);
  return { ok: true, session: publicSession(session), email: { sent: Boolean(email.sent), status: email.status, reason: email.reason || "sent", subject: email.subject } };
};

const pdfEscape = (value) => normalizeText(value, 1800)
  .replace(/[()\\]/g, "\\$&")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, "-")
  .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");

const wrapReportLine = (line, max = 86) => {
  const words = `${line || ""}`.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
};

export const renderRemoteFixReportPdfBytes = (overview) => {
  const title = `Rapport diagnostic RemoteFix - ${overview.case.caseId}`;
  const lines = [
    title,
    "",
    `Client: ${overview.case.name}`,
    `Statut: ${overview.case.status}`,
    `Decision: ${overview.triage?.decision || "a confirmer"}`,
    `Service: ${overview.triage?.service || "a confirmer"}`,
    `Risque: ${overview.triage?.riskLabel || "n/a"} ${overview.triage ? `(${overview.triage.riskScore}/100)` : ""}`,
    `Prix indicatif: ${overview.triage?.priceRange || overview.case.indicativePrice || "a confirmer"}`,
    "",
    "Raison:",
    overview.triage?.reason || "Diagnostic a confirmer.",
    "",
    "Prochaine action:",
    overview.triage?.nextAction || overview.case.nextStep || "A confirmer.",
    "",
    "Rapport agent:",
    overview.diagnostic?.summary || "Aucun rapport agent recu.",
    "",
    `Actions autorisees: ${(overview.diagnostic?.safeActionsToOffer || overview.triage?.allowedActions || []).join(", ") || "lecture seulement"}`,
    `Actions bloquees: ${(overview.diagnostic?.blockedActions || overview.triage?.blockedActions || []).join(", ") || "n/a"}`,
    "",
    "Principe: l'agent ne decide jamais. Le serveur signe seulement des commandes temporaires autorisees et journalisees."
  ];
  const renderedLines = lines.flatMap((line) => wrapReportLine(line));
  let y = 760;
  const textCommands = ["BT", "/F1 16 Tf", "50 790 Td", `(${pdfEscape(title)}) Tj`, "/F1 10 Tf"];
  for (const line of renderedLines.slice(1, 58)) {
    textCommands.push(`50 ${y} Td`);
    textCommands.push(`(${pdfEscape(line)}) Tj`);
    textCommands.push(`-50 -${y} Td`);
    y -= 13;
  }
  textCommands.push("ET");
  const stream = textCommands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
};
