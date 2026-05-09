import { NextResponse } from "next/server";
import { handleContactSubmission } from "@/lib/contact-workflow";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await handleContactSubmission(payload);

    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ ok: false, message: "La demande de contact n'a pas pu être traitée." }, { status: 400 });
  }
}