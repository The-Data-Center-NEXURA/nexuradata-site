import {
  formatCurrency,
  getPublicOrigin,
  normalizeText,
  recordCaseEvent,
  recordNotificationOutbox
} from "./cases.js";
import { sendResendEmail } from "./email.js";
import { buildQuoteDocument, quotePdfBase64 } from "./quotes.js";
import { sendWhatsAppBusinessMessage } from "./whatsapp.js";

const firstNameFrom = (name = "") => normalizeText(name, 120).split(" ").filter(Boolean)[0] || "";

const approvalLinkFor = (detail, requestUrl) => `${getPublicOrigin({}, requestUrl)}/suivi-dossier-client-montreal.html?caseId=${encodeURIComponent(detail.caseId || "")}`;

const statusTemplates = {
  "Nouveau dossier": (detail) => ({
    subject: `Votre dossier NEXURA DATA ${detail.caseId} a été créé`,
    body: [
      `Bonjour ${firstNameFrom(detail.name)},`,
      "",
      "Votre dossier NEXURA DATA a été créé.",
      "",
      `Numéro de dossier : ${detail.caseId}`,
      "",
      "Avant toute chose :",
      "",
      "* ne rebranchez plus le média;",
      "* ne tentez pas de réparation;",
      "* ne reformatez pas;",
      "* n’installez aucun logiciel de récupération.",
      "",
      "Nous vous contacterons avec les prochaines instructions.",
      "",
      "— NEXURA DATA"
    ].join("\n")
  }),
  "En attente du média": (detail) => ({
    subject: `Instructions d’envoi - dossier ${detail.caseId}`,
    body: [
      `Bonjour ${firstNameFrom(detail.name)},`,
      "",
      `Votre dossier ${detail.caseId} est prêt pour la réception du média.`,
      "",
      "Instructions :",
      "* gardez le média éteint et isolé;",
      "* n’ajoutez aucun fichier;",
      "* emballez-le avec protection contre les chocs;",
      "* inscrivez le numéro de dossier dans l’envoi ou le dépôt.",
      "",
      "Nous confirmerons la réception dès son arrivée.",
      "",
      "— NEXURA DATA"
    ].join("\n")
  }),
  "Média reçu": (detail) => ({
    subject: `Média reçu - dossier ${detail.caseId}`,
    body: [
      `Bonjour ${firstNameFrom(detail.name)},`,
      "",
      `Nous confirmons la réception de votre média pour le dossier ${detail.caseId}.`,
      "",
      "Le diagnostic gratuit peut maintenant commencer. Vous recevrez une estimation ferme avant toute intervention facturable.",
      "",
      "— NEXURA DATA"
    ].join("\n")
  }),
  "Diagnostic terminé": (detail, requestUrl) => quoteTemplate(detail, requestUrl),
  "Soumission envoyée": (detail, requestUrl) => quoteTemplate(detail, requestUrl),
  "Approuvé": (detail) => ({
    subject: `Soumission approuvée - dossier ${detail.caseId}`,
    body: [
      `Bonjour ${firstNameFrom(detail.name)},`,
      "",
      `Votre soumission pour le dossier ${detail.caseId} est approuvée.`,
      "",
      "La facture et le lien de paiement Stripe sécurisé sont maintenant préparés. Le travail ou la livraison sera débloqué après réception du paiement.",
      "",
      "— NEXURA DATA"
    ].join("\n")
  }),
  "Paiement requis": (detail) => ({
    subject: `Paiement requis - dossier ${detail.caseId}`,
    body: [
      `Bonjour ${firstNameFrom(detail.name)},`,
      "",
      `Le lien Stripe sécurisé du dossier ${detail.caseId} a été créé et envoyé.`,
      "",
      "Dès réception du paiement, le statut passera à Payé et le travail démarre ou la livraison chiffrée est débloquée.",
      "",
      "— NEXURA DATA"
    ].join("\n")
  }),
  "Payé": (detail) => ({
    subject: `Paiement reçu - dossier ${detail.caseId}`,
    body: [
      `Bonjour ${firstNameFrom(detail.name)},`,
      "",
      `Nous confirmons la réception du paiement pour le dossier ${detail.caseId}.`,
      "",
      "Le travail démarre ou la livraison chiffrée est maintenant débloquée selon l’état du dossier.",
      "",
      "— NEXURA DATA"
    ].join("\n")
  }),
  "Livraison prête": (detail) => ({
    subject: `Livraison chiffrée prête - dossier ${detail.caseId}`,
    body: [
      `Bonjour ${firstNameFrom(detail.name)},`,
      "",
      `La livraison chiffrée du dossier ${detail.caseId} est prête.`,
      "",
      "NEXURA DATA vous transmettra les consignes d’accès dans un canal sécurisé.",
      "",
      "— NEXURA DATA"
    ].join("\n")
  }),
  "Rapport final": (detail) => ({
    subject: `Rapport final - dossier ${detail.caseId}`,
    body: [
      `Bonjour ${firstNameFrom(detail.name)},`,
      "",
      `Le rapport final du dossier ${detail.caseId} est prêt.`,
      "",
      "Il résume l’intervention, la livraison et les éléments de clôture utiles.",
      "",
      "— NEXURA DATA"
    ].join("\n")
  }),
  "Avis demandé": (detail) => ({
    subject: `Votre avis sur NEXURA DATA`,
    body: [
      `Bonjour ${firstNameFrom(detail.name)},`,
      "",
      `Votre dossier ${detail.caseId} est clôturé ou en voie de clôture.`,
      "",
      "Si l’accompagnement vous a été utile, votre avis aide d’autres clients et entreprises à trouver une aide sérieuse au bon moment.",
      "",
      "— NEXURA DATA"
    ].join("\n")
  })
};

function quoteTemplate(detail, requestUrl) {
  const document = buildQuoteDocument(detail, requestUrl);
  return {
    subject: `${document.title} - ${detail.caseId}`,
    body: [
      `Bonjour ${firstNameFrom(detail.name)},`,
      "",
      "Le diagnostic de votre média est terminé.",
      "",
      "Résumé :",
      document.diagnosticSummary,
      "",
      "Prix ferme :",
      document.amountFormatted || formatCurrency(detail.quoteAmountCents),
      "",
      "Délai estimé :",
      document.estimatedTimeline,
      "",
      "Aucun travail facturable ne sera effectué sans votre approbation écrite.",
      "",
      "Approuver la soumission :",
      approvalLinkFor(detail, requestUrl),
      "",
      "— NEXURA DATA"
    ].join("\n"),
    attachment: {
      filename: `${document.quoteNumber}.pdf`,
      content: quotePdfBase64(document)
    }
  };
}

const buildStatusTemplate = (status, detail, requestUrl) => {
  const builder = statusTemplates[status];
  if (!builder) return null;
  return builder(detail, requestUrl);
};

const outboxStateFrom = (delivery) => delivery?.sent ? "sent" : delivery?.reason === "not-configured" ? "pending" : "failed";

export const sendLifecycleNotifications = async (env, detail, requestUrl, status = detail?.status, actor = "system") => {
  const statusTrigger = normalizeText(status, 80);
  const template = buildStatusTemplate(statusTrigger, detail, requestUrl);

  if (!template || !detail?.caseId) {
    return { email: { sent: false, reason: "no-template" }, whatsapp: { sent: false, reason: "no-template" } };
  }

  const idempotencyKey = `lifecycle-${detail.caseId}-${statusTrigger}-${detail.updatedAt || "now"}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  const emailPayload = {
    to: [detail.email],
    subject: template.subject,
    text: template.body,
    ...(template.attachment ? { attachments: [template.attachment] } : {})
  };
  const emailDelivery = await sendResendEmail(env, emailPayload, idempotencyKey);

  await recordNotificationOutbox(env, {
    notificationId: `${idempotencyKey}-email`,
    caseId: detail.caseId,
    channel: "email",
    statusTrigger,
    recipient: detail.email,
    subject: template.subject,
    body: template.body,
    state: outboxStateFrom(emailDelivery),
    provider: "resend",
    providerMessageId: emailDelivery?.id || "",
    error: emailDelivery?.error || emailDelivery?.reason || "",
    sentAt: emailDelivery?.sent,
    actor
  });

  const whatsappDelivery = await sendWhatsAppBusinessMessage(env, {
    to: detail.phone,
    body: template.body
  });

  await recordNotificationOutbox(env, {
    notificationId: `${idempotencyKey}-whatsapp`,
    caseId: detail.caseId,
    channel: "whatsapp",
    statusTrigger,
    recipient: detail.phone,
    subject: template.subject,
    body: template.body,
    state: outboxStateFrom(whatsappDelivery),
    provider: "whatsapp-business-api",
    providerMessageId: whatsappDelivery?.id || "",
    error: whatsappDelivery?.error || whatsappDelivery?.reason || "",
    sentAt: whatsappDelivery?.sent,
    actor
  });

  await recordCaseEvent(
    env,
    detail.caseId,
    actor,
    "Notifications automatiques traitées",
    `${statusTrigger}: email=${emailDelivery.sent ? "sent" : emailDelivery.reason}, whatsapp=${whatsappDelivery.sent ? "sent" : whatsappDelivery.reason}.`
  );

  return {
    email: emailDelivery,
    whatsapp: whatsappDelivery
  };
};