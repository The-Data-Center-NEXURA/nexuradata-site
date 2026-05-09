import "server-only";

import type { LeadScore } from "@/lib/lead-scoring";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { SubmissionMetadata } from "@/lib/submission-guard";
import type { LeadPayload } from "@/lib/validation";

const optionalText = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const storeLeadInSupabase = async (lead: LeadPayload, score: LeadScore, metadata?: SubmissionMetadata) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: true, skipped: true, reason: "Supabase non configuré" };
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      form_type: lead.formType,
      full_name: lead.fullName,
      email: lead.email,
      company: lead.company,
      website: optionalText(lead.website),
      role: optionalText(lead.role),
      team_size: lead.teamSize,
      monthly_lead_volume: lead.monthlyLeadVolume,
      current_stack: lead.currentStack,
      biggest_constraint: lead.biggestConstraint,
      timeline: lead.timeline,
      budget: lead.budget,
      consent: lead.consent,
      lead_score: score.score,
      lead_tier: score.tier,
      score_reasons: score.reasons,
      next_step: score.nextStep,
      payload: lead,
      endpoint: metadata?.endpoint || null,
      referrer: metadata?.referrer || null,
      user_agent: metadata?.userAgent || null,
      ip_hash: metadata?.ipHash || null,
      source: "nexura-site",
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, status: error.code, message: error.message };
  }

  return { ok: true, id: data?.id };
};
