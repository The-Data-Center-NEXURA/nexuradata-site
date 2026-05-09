import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

function sanitize(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 2000);
}

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = sanitize(body.name);
    const email = sanitize(body.email).toLowerCase();
    const company = sanitize(body.company);
    const message = sanitize(body.message);

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    if (supabase) {
      const { error } = await supabase.from("leads").insert({
        name,
        email,
        company,
        message,
        source: "automation_audit_form",
        status: "new",
      });

      if (error) {
        console.error("Supabase insert error:", error);
      }
    }

    if (resend) {
      await resend.emails.send({
        from: "Nexadura <onboarding@resend.dev>",
        to: process.env.CONTACT_TO_EMAIL || "contact@nexuradata.ca",
        subject: "New Nexadura Automation Audit Request",
        html:
          "<h2>New Automation Audit Request</h2>" +
          `<p><strong>Name:</strong> ${escapeHtml(name)}</p>` +
          `<p><strong>Email:</strong> ${escapeHtml(email)}</p>` +
          `<p><strong>Company:</strong> ${company ? escapeHtml(company) : "Not provided"}</p>` +
          "<p><strong>Message:</strong></p>" +
          `<p>${escapeHtml(message)}</p>`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact route error:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}