import { NextResponse } from "next/server";
import { storeLead } from "@/lib/crm";
import { sendLeadAlert } from "@/lib/email";
import { enqueueFollowUp } from "@/lib/follow-up";
import { scoreLead } from "@/lib/lead-scoring";
import { leadSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = leadSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Invalid lead payload.", issues: parsed.error.flatten() }, { status: 400 });
    }

    const lead = parsed.data;
    const score = scoreLead(lead);
    const automationResults = await Promise.allSettled([
      storeLead(lead, score),
      sendLeadAlert(lead, score),
      enqueueFollowUp(lead, score),
    ]);

    return NextResponse.json({
      ok: true,
      leadScore: score.score,
      leadTier: score.tier,
      nextStep: score.nextStep,
      automationResults: automationResults.map((result) => result.status),
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Lead submission could not be processed." }, { status: 400 });
  }
}