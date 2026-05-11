import type { LeadScore } from "@/lib/lead-scoring";
import type { LeadPayload } from "@/lib/validation";

export const enqueueFollowUp = async (lead: LeadPayload, score: LeadScore) => {
  const webhookUrl = process.env.FOLLOW_UP_WEBHOOK_URL;
  if (!webhookUrl) return { ok: true, skipped: true, reason: "FOLLOW_UP_WEBHOOK_URL non configuré" };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead, score, sequence: score.tier }),
  });

  return { ok: response.ok, status: response.status };
};