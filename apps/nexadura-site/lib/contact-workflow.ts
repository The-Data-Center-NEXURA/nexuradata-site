import { enqueueFollowUp } from "@/lib/follow-up";
import { sendLeadAlert } from "@/lib/email";
import { scoreLead } from "@/lib/lead-scoring";
import { storeLead } from "@/lib/crm";
import { storeLeadInSupabase } from "@/lib/supabase-leads";
import type { SubmissionMetadata } from "@/lib/submission-guard";
import { leadSchema } from "@/lib/validation";

const hasFilledHoneypot = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return false;
  const value = (payload as Record<string, unknown>).websiteUrl;
  return typeof value === "string" && value.trim().length > 0;
};

export const handleContactSubmission = async (payload: unknown, metadata?: SubmissionMetadata) => {
  if (hasFilledHoneypot(payload)) {
    return {
      ok: true as const,
      status: 200,
      body: {
        ok: true,
        leadScore: 0,
        leadTier: "nurture",
        nextStep: "Demande reçue.",
        automationResults: ["skipped"],
      },
    };
  }

  const parsed = leadSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      body: { ok: false, message: "Demande invalide.", issues: parsed.error.flatten() },
    };
  }

  const lead = parsed.data;
  const score = scoreLead(lead);
  const automationResults = await Promise.allSettled([
    storeLeadInSupabase(lead, score, metadata),
    sendLeadAlert(lead, score),
    storeLead(lead, score),
    enqueueFollowUp(lead, score),
  ]);

  return {
    ok: true as const,
    status: 200,
    body: {
      ok: true,
      leadScore: score.score,
      leadTier: score.tier,
      nextStep: score.nextStep,
      automationResults: automationResults.map((result) => result.status),
    },
  };
};
