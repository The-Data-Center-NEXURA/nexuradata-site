import { buildCaseAutomationDraft } from "./automation.js";

const normalizeText = (value, maxLength = 500) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
};

const normalizePhoneDigits = (value = "") => `${value}`.replace(/\D/g, "");

export const normalizeWhatsAppPhone = (value = "") => {
  const digits = normalizePhoneDigits(value);

  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return digits;
  if (digits.length > 11) return digits;
  return "";
};

const missingInfoLabels = {
  telephone: "un numéro de téléphone direct",
  "device-model": "le modèle exact du support et sa capacité",
  "raid-layout": "le nombre de disques, le type de RAID et toute tentative de reconstruction",
  "incident-timeline": "une courte chronologie des événements et le contexte légal ou assurance",
  "mobile-access-state": "le modèle du téléphone, l'état du code d'accès et le compte iCloud ou Google associé"
};

const categorySafety = {
  raid: "ne lancez aucune reconstruction et ne changez pas l'ordre des disques",
  forensic: "préservez l'état actuel et évitez toute manipulation non documentée",
  mobile: "ne réinitialisez pas l'appareil et évitez les essais répétés de code",
  media: "cessez d'utiliser le support et évitez les logiciels de réparation",
  guided: "évitez les réinstallations, nettoyages ou réparations avant validation"
};

const priorityLabels = {
  human_review: "Revue humaine prioritaire",
  assisted: "Réponse assistée",
  standard: "Suivi standard"
};

const inferPriority = (draft) => {
  if (draft.riskLevel === "sensitive" || draft.flags.includes("forensic-boundary") || draft.flags.includes("incident-response")) {
    return "human_review";
  }

  if (draft.riskLevel === "high" || draft.flags.includes("priority-response") || draft.category === "raid") {
    return "assisted";
  }

  return "standard";
};

const buildQuestionLine = (missingInfo) => {
  const questions = missingInfo.map((key) => missingInfoLabels[key]).filter(Boolean);

  if (questions.length === 0) {
    return "Aucune information critique ne manque pour la première lecture.";
  }

  return `Il manque: ${questions.join("; ")}.`;
};

const buildClientMessage = ({ caseId, name, draft }) => {
  const firstName = normalizeText(name, 80).split(" ")[0] || "";
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const safety = categorySafety[draft.category] || categorySafety.guided;
  const questionLine = buildQuestionLine(draft.missingInfo);

  return [
    `${greeting} ici NEXURADATA. Votre dossier ${caseId} est ouvert.`,
    `Parcours probable: ${draft.recommendedPath}.`,
    `Pour protéger les données: ${safety}.`,
    questionLine,
    "Répondez ici avec ces éléments et nous confirmerons la prochaine étape avant toute intervention."
  ].join("\n");
};

const buildOperatorSummary = ({ record, draft, channel, whatsappUrl }) => [
  `Canal recommandé: ${channel === "whatsapp" ? "WhatsApp" : "courriel / téléphone"}`,
  `Priorité concierge: ${priorityLabels[inferPriority(draft)]}`,
  `Parcours: ${draft.recommendedPath}`,
  `Risque: ${draft.riskLevel}`,
  draft.flags.length ? `Marqueurs: ${draft.flags.join(", ")}` : "Marqueurs: aucun",
  draft.missingInfo.length ? `Questions: ${draft.missingInfo.map((key) => missingInfoLabels[key] || key).join("; ")}` : "Questions: aucune critique",
  whatsappUrl ? `Lien WhatsApp: ${whatsappUrl}` : "Lien WhatsApp: non disponible",
  `Client: ${record.name || record.nom || ""} · ${record.email || record.courriel || ""} · ${record.phone || record.telephone || ""}`
].filter(Boolean).join("\n");

export const buildConciergeDraft = (record = {}) => {
  const normalizedRecord = {
    caseId: normalizeText(record.caseId || record.case_id || "", 40),
    name: normalizeText(record.name || record.nom || "", 120),
    email: normalizeText(record.email || record.courriel || "", 160),
    phone: normalizeText(record.phone || record.telephone || "", 40),
    support: normalizeText(record.support || "", 80),
    urgence: normalizeText(record.urgency || record.urgence || "", 40),
    impact: normalizeText(record.impact || "", 100),
    sensibilite: normalizeText(record.sensibilite || record.sensitivity || "", 100),
    message: normalizeText(record.message || "", 3000)
  };
  const draft = buildCaseAutomationDraft({
    telephone: normalizedRecord.phone,
    support: normalizedRecord.support,
    urgence: normalizedRecord.urgence,
    impact: normalizedRecord.impact,
    sensibilite: normalizedRecord.sensibilite,
    message: normalizedRecord.message
  });
  const whatsappPhone = normalizeWhatsAppPhone(normalizedRecord.phone);
  const channel = whatsappPhone ? "whatsapp" : "email";
  const clientMessage = buildClientMessage({
    caseId: normalizedRecord.caseId || "NEXURADATA",
    name: normalizedRecord.name,
    draft
  });
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(clientMessage)}`
    : "";
  const priority = inferPriority(draft);

  return {
    provider: "nexuradata-concierge",
    channel,
    priority,
    priorityLabel: priorityLabels[priority],
    caseId: normalizedRecord.caseId,
    category: draft.category,
    categoryLabel: draft.categoryLabel,
    riskLevel: draft.riskLevel,
    recommendedPath: draft.recommendedPath,
    missingInfo: draft.missingInfo,
    questions: draft.missingInfo.map((key) => missingInfoLabels[key] || key),
    safetyInstruction: categorySafety[draft.category] || categorySafety.guided,
    clientMessage,
    operatorSummary: buildOperatorSummary({ record: normalizedRecord, draft, channel, whatsappUrl }),
    whatsappUrl,
    shouldHumanReview: priority === "human_review",
    automation: draft
  };
};

export const formatConciergeEventNote = (draft) => [
  draft.operatorSummary,
  "",
  "Message proposé:",
  draft.clientMessage
].join("\n");
