import "server-only";

import { NextResponse } from "next/server";
import { handleContactSubmission } from "@/lib/contact-workflow";
import { checkSubmissionRateLimit, getSubmissionMetadata } from "@/lib/submission-guard";

export const handleLeadPost = async (request: Request, endpoint: string, errorMessage: string) => {
  const rateLimit = checkSubmissionRateLimit(request);
  if (rateLimit.limited) {
    return NextResponse.json(
      { ok: false, message: "Trop de demandes rapprochées. Veuillez réessayer dans quelques minutes." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  try {
    const payload = await request.json();
    const result = await handleContactSubmission(payload, getSubmissionMetadata(request, endpoint));

    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ ok: false, message: errorMessage }, { status: 400 });
  }
};
