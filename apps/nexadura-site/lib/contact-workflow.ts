import { enqueueFollowUp } from "@/lib/follow-up";
import { sendLeadAlert } from "@/lib/email";
import { scoreLead } from "@/lib/lead-scoring";
import { storeLead } from "@/lib/crm";
import { leadSchema } from "@/lib/validation";

export const handleContactSubmission = async (payload: unknown) => {
  const parsed = leadSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      body: { ok: false, message: "Invalid lead payload.", issues: parsed.error.flatten() },
    };
  }

  const lead = parsed.data;
  const score = scoreLead(lead);
  const automationResults = await Promise.allSettled([
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