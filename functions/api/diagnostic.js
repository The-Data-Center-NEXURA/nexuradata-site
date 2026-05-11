import { buildCaseAutomationDraft } from "../_lib/automation.js";
import { json, methodNotAllowed, onOptions, parsePayload } from "../_lib/http.js";
import { checkRateLimit, tooManyRequests } from "../_lib/rate-limit.js";

const normalizeText = (value, maxLength = 240) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
};

const optionLabel = (value, labels, fallback = "") => labels[value] || fallback || value || "";

const supportLabels = {
  drive: "Disque dur",
  ssd: "SSD",
  raid: "RAID / NAS / serveur",
  server: "RAID / NAS / serveur",
  phone: "Téléphone / mobile",
  removable: "USB / carte mémoire"
};

const symptomLabels = {
  deleted: "Fichiers supprimés",
  slow: "Lent / instable",
  not_detected: "Non détecté",
  physical: "Choc / bruit",
  water: "Liquide",
  encrypted: "Chiffré / forensique"
};

const urgencyLabels = {
  standard: "Standard",
  business: "Rapide",
  critical: "Urgent"
};

const historyLabels = {
  no_attempt: "Aucune tentative",
  software: "Logiciel de récupération tenté",
  opened: "Support ouvert",
  rebuild: "Reconstruction RAID tentée",
  powered_on: "Redémarrages répétés"
};

const valueLabels = {
  personal: "Personnel",
  business: "Entreprise",
  legal: "Juridique",
  medical: "Données sensibles"
};

const stateLabels = {
  powered_off: "Éteint",
  unplugged: "Débranché",
  running: "Encore allumé",
  unknown: "Inconnu"
};

const buildDiagnosticSubmission = (payload = {}) => {
  const support = normalizeText(payload.support, 40);
  const symptom = normalizeText(payload.symptom, 40);
  const urgency = normalizeText(payload.urgency || payload.urgence, 40);
  const history = normalizeText(payload.history, 40);
  const value = normalizeText(payload.value, 40);
  const state = normalizeText(payload.state, 40);
  const context = normalizeText(payload.context || payload.message, 900);
  const supportLabel = optionLabel(support, supportLabels, normalizeText(payload.supportLabel, 80));
  const symptomLabel = optionLabel(symptom, symptomLabels, normalizeText(payload.symptomLabel, 80));
  const urgencyLabel = optionLabel(urgency, urgencyLabels, normalizeText(payload.urgencyLabel, 80));
  const historyLabel = optionLabel(history, historyLabels, normalizeText(payload.historyLabel, 80));
  const valueLabel = optionLabel(value, valueLabels, normalizeText(payload.valueLabel, 80));
  const stateLabel = optionLabel(state, stateLabels, normalizeText(payload.stateLabel, 80));
  const message = [
    context,
    `Support sélectionné: ${supportLabel}`,
    `Symptôme sélectionné: ${symptomLabel}`,
    `Urgence sélectionnée: ${urgencyLabel}`,
    `Tentative sélectionnée: ${historyLabel}`,
    `Valeur sélectionnée: ${valueLabel}`,
    `État sélectionné: ${stateLabel}`
  ].filter(Boolean).join("\n");

  return {
    support: supportLabel,
    urgence: urgencyLabel,
    urgency: urgencyLabel,
    profil: value === "business" || value === "medical" ? "Entreprise / TI" : value === "legal" ? "Cabinet juridique" : "Particulier",
    impact: urgency === "critical" || urgency === "business" ? "Opérations bloquées" : value === "business" || value === "medical" ? "Données importantes" : "Planifié / non urgent",
    sensibilite: symptom === "encrypted" || value === "legal" ? "Preuve / chaîne de possession" : value === "medical" ? "Données sensibles" : value === "business" ? "Confidentiel" : "Standard",
    message
  };
};

const buildDiagnosticBrief = (draft) => ({
  title: draft.serviceLevelLabel || draft.recommendedPath,
  recommendedPath: draft.recommendedPath,
  serviceLevelLabel: draft.serviceLevelLabel,
  sla: draft.sla,
  nextStep: draft.statusPlan?.nextStep || draft.nextStep,
  quoteReadiness: draft.quotePlan?.readiness || "review-before-quote",
  quoteLabel: draft.quotePlan?.label || "Soumission à préparer",
  clientAction: draft.clientActions?.[0] || "Conserver le support original dans son état actuel.",
  operatorFocus: (draft.operatorTasks || []).slice(0, 3),
  missingInfo: (draft.missingInfoLabels || []).slice(0, 4),
  boundary: draft.proposal?.boundary || "Aucune intervention ne commence sans accord explicite.",
  auditFlags: draft.handlingFlags
});

const publicDiagnosticFrom = (draft) => ({
  category: draft.category,
  categoryLabel: draft.categoryLabel,
  riskLevel: draft.riskLevel,
  brief: buildDiagnosticBrief(draft),
  expertSignals: draft.expertSignals,
  clientNeed: draft.clientNeed,
  emotionalContext: draft.emotionalContext,
  proposal: draft.proposal,
  serviceLevel: draft.serviceLevel,
  serviceLevelLabel: draft.serviceLevelLabel,
  sla: draft.sla,
  recommendedPath: draft.recommendedPath,
  servicePath: draft.servicePath,
  statusPlan: draft.statusPlan,
  quotePlan: draft.quotePlan,
  missingInfo: draft.missingInfo,
  missingInfoLabels: draft.missingInfoLabels,
  clientActions: draft.clientActions,
  operatorTasks: draft.operatorTasks,
  automationActions: draft.automationActions,
  handlingFlags: draft.handlingFlags
});

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  const limit = checkRateLimit(context.request, 12);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  try {
    const payload = await parsePayload(context.request);
    const submission = buildDiagnosticSubmission(payload);
    const draft = buildCaseAutomationDraft(submission);

    return json({
      ok: true,
      provider: "nexuradata-diagnostic",
      diagnostic: publicDiagnosticFrom(draft)
    });
  } catch {
    return json({ ok: false, message: "Diagnostic indisponible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
