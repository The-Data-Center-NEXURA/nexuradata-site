import type { LeadScore } from "@/lib/lead-scoring";
import type { LeadPayload } from "@/lib/validation";

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export const sendLeadAlert = async (lead: LeadPayload, score: LeadScore) => {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_ALERT_TO;
  if (!apiKey || !to) return { ok: true, skipped: true, reason: "Alerte Resend non configurée" };

  const from = process.env.LEAD_ALERT_FROM || "NEXURA <leads@nexura.ca>";
  const subject = `[${score.tier.toUpperCase()} ${score.score}] ${lead.company} - ${lead.formType}`;
  const html = `
    <h1>Nouvelle demande ${escapeHtml(lead.formType)}</h1>
    <p><strong>${escapeHtml(lead.company)}</strong> - ${escapeHtml(lead.fullName)} (${escapeHtml(lead.email)})</p>
    <p><strong>Score:</strong> ${score.score} (${escapeHtml(score.tier)})</p>
    <p><strong>Prochaine étape:</strong> ${escapeHtml(score.nextStep)}</p>
    <p><strong>Pile actuelle:</strong> ${escapeHtml(lead.currentStack)}</p>
    <p><strong>Contrainte:</strong> ${escapeHtml(lead.biggestConstraint)}</p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `nexura-lead-${lead.email}-${Date.now()}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  return { ok: response.ok, status: response.status };
};