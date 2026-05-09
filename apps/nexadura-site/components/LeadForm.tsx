"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { trackConversion } from "@/lib/analytics";

type LeadFormProps = {
  formType: "contact" | "audit";
};

const inputClass = "focus-ring w-full rounded-xl rounded-bl-md border border-line bg-white px-4 py-3 text-sm";

export function LeadForm({ formType }: LeadFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, formType, consent: formData.get("consent") === "on" }),
    });

    if (response.ok) {
      const result = await response.json();
      trackConversion("lead_form_submit", { form_type: formType, lead_score: result.leadScore, lead_tier: result.leadTier });
      event.currentTarget.reset();
      setStatus("success");
    } else {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl rounded-bl-md border border-line bg-white/55 p-5 shadow-panel">
      <div className="grid gap-4 sm:grid-cols-2">
        <input className={inputClass} name="fullName" placeholder="Full name" required />
        <input className={inputClass} name="email" placeholder="Work email" type="email" required />
        <input className={inputClass} name="company" placeholder="Company" required />
        <input className={inputClass} name="website" placeholder="Website" />
        <input className={inputClass} name="role" placeholder="Role" />
        <select className={inputClass} name="teamSize" required defaultValue="">
          <option value="" disabled>Team size</option>
          <option value="1-5">1-5</option>
          <option value="6-20">6-20</option>
          <option value="21-50">21-50</option>
          <option value="51-200">51-200</option>
          <option value="200+">200+</option>
        </select>
        <select className={inputClass} name="monthlyLeadVolume" required defaultValue="">
          <option value="" disabled>Monthly lead volume</option>
          <option value="0-25">0-25</option>
          <option value="26-100">26-100</option>
          <option value="101-500">101-500</option>
          <option value="500+">500+</option>
        </select>
        <select className={inputClass} name="timeline" required defaultValue="">
          <option value="" disabled>Timeline</option>
          <option value="now">Now</option>
          <option value="30-days">Next 30 days</option>
          <option value="quarter">This quarter</option>
          <option value="exploring">Exploring</option>
        </select>
        <select className={inputClass} name="budget" required defaultValue="">
          <option value="" disabled>Budget range</option>
          <option value="under-2k">Under 2k</option>
          <option value="2k-5k">2k-5k</option>
          <option value="5k-15k">5k-15k</option>
          <option value="15k+">15k+</option>
          <option value="unknown">Unknown</option>
        </select>
        <input className={inputClass} name="currentStack" placeholder="Current CRM / tools" required />
      </div>
      <textarea className={`${inputClass} min-h-32 resize-y`} name="biggestConstraint" placeholder="Where does the workflow break today?" required />
      <label className="flex gap-3 text-sm leading-6 text-muted">
        <input className="mt-1" type="checkbox" name="consent" required />
        <span>I agree to be contacted about this request.</span>
      </label>
      <button className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl rounded-bl-md bg-ink px-5 py-3 font-semibold text-paper disabled:opacity-60" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Sending..." : "Send request"}
        <Send size={17} aria-hidden="true" />
      </button>
      {status === "success" ? <p className="text-sm font-semibold text-signal">Request received. We will review the workflow context and reply with the next step.</p> : null}
      {status === "error" ? <p className="text-sm font-semibold text-red-700">The request could not be sent. Please try again.</p> : null}
    </form>
  );
}