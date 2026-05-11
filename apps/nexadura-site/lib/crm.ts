import type { LeadScore } from "@/lib/lead-scoring";
import type { LeadPayload } from "@/lib/validation";

export const storeLead = async (lead: LeadPayload, score: LeadScore) => {
  const webhookUrl = process.env.CRM_WEBHOOK_URL;
  if (!webhookUrl) return { ok: true, skipped: true, reason: "CRM_WEBHOOK_URL not configured" };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.CRM_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${process.env.CRM_WEBHOOK_TOKEN}`;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ lead, score, source: "nexadura.ca" }),
  });

  return { ok: response.ok, status: response.status };
};