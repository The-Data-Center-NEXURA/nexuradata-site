"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/nexadura/automation-audit";

type FormState = {
  name: string;
  email: string;
  company: string;
  message: string;
};

export default function AuditForm() {
  const [formData, setFormData] = useState<FormState>({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  function updateField(field: keyof FormState, value: string) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to submit");

      setStatus("success");
      setFormData({ name: "", email: "", company: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="audit" className="px-6 py-24">
      <div className="mx-auto grid max-w-7xl gap-10 rounded-3xl border border-slate-800 bg-white p-8 text-slate-950 md:grid-cols-[0.9fr_1.1fr] md:p-12">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Automation Audit</p>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Find the workflows costing you speed and revenue.</h2>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Request a focused audit. Nexadura will identify where AI systems, automation, and better process architecture can create immediate leverage.
          </p>
        </div>

        <form onSubmit={submitForm} className="grid gap-4">
          <input
            className="rounded-2xl border border-slate-300 px-5 py-4 outline-none focus:border-blue-500"
            placeholder="Name"
            value={formData.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
          />
          <input
            className="rounded-2xl border border-slate-300 px-5 py-4 outline-none focus:border-blue-500"
            placeholder="Email"
            type="email"
            value={formData.email}
            onChange={(event) => updateField("email", event.target.value)}
            required
          />
          <input
            className="rounded-2xl border border-slate-300 px-5 py-4 outline-none focus:border-blue-500"
            placeholder="Company / Website"
            value={formData.company}
            onChange={(event) => updateField("company", event.target.value)}
          />
          <textarea
            className="min-h-32 rounded-2xl border border-slate-300 px-5 py-4 outline-none focus:border-blue-500"
            placeholder="What process or bottleneck do you want automated?"
            value={formData.message}
            onChange={(event) => updateField("message", event.target.value)}
            required
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-7 py-4 font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Sending..." : "Request Audit"} <ArrowRight size={18} />
          </button>
          {status === "success" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              <p>Request sent. We will review the workflow opportunity.</p>
              <a href={calendlyUrl} className="mt-3 inline-flex font-semibold text-blue-700 hover:text-blue-600">
                Book the qualified call on Calendly
              </a>
            </div>
          )}
          {status === "error" && <p className="text-sm font-medium text-red-600">Something went wrong. Please try again.</p>}
        </form>
      </div>
    </section>
  );
}