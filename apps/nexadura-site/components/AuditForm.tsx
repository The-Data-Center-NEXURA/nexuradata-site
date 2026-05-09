"use client";

import { FormEvent, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Send } from "lucide-react";
import { trackConversion } from "@/lib/analytics";

type AuditFormProps = {
  formType?: "contact" | "audit";
};

const inputClass = "focus-ring w-full rounded-xl rounded-bl-md border border-line bg-[#11100e] px-4 py-3 text-sm text-paper placeholder:text-muted";
const labelClass = "grid gap-2 text-sm font-semibold text-paper";

type FieldProps = {
  label: string;
  children: ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <label className={labelClass}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function AuditForm({ formType = "audit" }: AuditFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const hasTrackedStart = useRef(false);

  const trackFormStart = () => {
    if (hasTrackedStart.current) return;
    hasTrackedStart.current = true;
    trackConversion("audit_form_start", { form_type: formType });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    const form = event.currentTarget;
    const payload = new FormData(form);
    const formData = { ...Object.fromEntries(payload.entries()), formType, consent: payload.get("consent") === "on" };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        trackConversion("audit_form_submit", { form_type: formType, lead_score: result.leadScore, lead_tier: result.leadTier });
        form.reset();
        setStatus("success");
        return;
      }
      trackConversion("audit_form_error", { form_type: formType, status: response.status });
      setStatus("error");
    } catch {
      trackConversion("audit_form_error", { form_type: formType, status: "network" });
      setStatus("error");
    }
  };

  return (
    <section className="section-shell grid gap-8 py-16 md:grid-cols-[0.85fr_1.15fr]">
      <div>
        <p className="eyebrow">Conversation qualifiée</p>
        <h2 className="mt-4 text-3xl font-black md:text-4xl">Commencez par l'audit. Planifiez la première conversation d'automatisation.</h2>
        <p className="mt-5 text-lg leading-8 text-muted">Partagez le contexte opérationnel, les outils actuels, le volume de demandes et le blocage. NEXURA qualifiera la demande et la routera vers le suivi.</p>
      </div>
      <form onFocusCapture={trackFormStart} onSubmit={submit} className="grid gap-4 rounded-2xl rounded-bl-md border border-line bg-[#0b0b0a]/85 p-5 shadow-panel">
        <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label>
            Website URL
            <input name="websiteUrl" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom complet">
            <input className={inputClass} name="fullName" placeholder="Votre nom" required />
          </Field>
          <Field label="Courriel professionnel">
            <input className={inputClass} name="email" placeholder="nom@entreprise.ca" type="email" required />
          </Field>
          <Field label="Entreprise">
            <input className={inputClass} name="company" placeholder="Nom de l'entreprise" required />
          </Field>
          <Field label="Site web">
            <input className={inputClass} name="website" placeholder="https://" />
          </Field>
          <Field label="Rôle">
            <input className={inputClass} name="role" placeholder="Direction, opérations, ventes..." />
          </Field>
          <Field label="Taille de l'équipe">
            <select className={inputClass} name="teamSize" required defaultValue="">
              <option value="" disabled>
                Sélectionner
              </option>
              <option value="1-5">1-5</option>
              <option value="6-20">6-20</option>
              <option value="21-50">21-50</option>
              <option value="51-200">51-200</option>
              <option value="200+">200+</option>
            </select>
          </Field>
          <Field label="Volume mensuel de demandes">
            <select className={inputClass} name="monthlyLeadVolume" required defaultValue="">
              <option value="" disabled>
                Sélectionner
              </option>
              <option value="0-25">0-25</option>
              <option value="26-100">26-100</option>
              <option value="101-500">101-500</option>
              <option value="500+">500+</option>
            </select>
          </Field>
          <Field label="Échéancier">
            <select className={inputClass} name="timeline" required defaultValue="">
              <option value="" disabled>
                Sélectionner
              </option>
              <option value="now">Maintenant</option>
              <option value="30-days">Dans les 30 prochains jours</option>
              <option value="quarter">Ce trimestre</option>
              <option value="exploring">En exploration</option>
            </select>
          </Field>
          <Field label="Fourchette budgétaire">
            <select className={inputClass} name="budget" required defaultValue="">
              <option value="" disabled>
                Sélectionner
              </option>
              <option value="under-2k">Moins de 2 k$</option>
              <option value="2k-5k">2 k$ à 5 k$</option>
              <option value="5k-15k">5 k$ à 15 k$</option>
              <option value="15k+">15 k$ et plus</option>
              <option value="unknown">À confirmer</option>
            </select>
          </Field>
          <Field label="CRM / outils actuels">
            <input className={inputClass} name="currentStack" placeholder="HubSpot, Salesforce, Notion, Airtable..." required />
          </Field>
        </div>
        <Field label="Blocage principal du flux de travail">
          <textarea className={`${inputClass} min-h-32 resize-y`} name="biggestConstraint" placeholder="Décrivez où la demande, le suivi ou le reporting se brise aujourd'hui." required />
        </Field>
        <label className="flex gap-3 text-sm leading-6 text-muted">
          <input className="mt-1" type="checkbox" name="consent" required />
          <span>J'accepte d'être contacté au sujet de cette demande.</span>
        </label>
        <button className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl rounded-bl-md bg-signal px-5 py-3 font-semibold text-ink disabled:opacity-60" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Envoi..." : "Envoyer la demande"}
          <Send size={17} aria-hidden="true" />
        </button>
        {status === "success" ? <p className="text-sm font-semibold text-signal">Demande reçue. Nous allons revoir le contexte du flux et répondre avec la prochaine étape.</p> : null}
        {status === "error" ? <p className="text-sm font-semibold text-ember">La demande n'a pas pu être envoyée. Veuillez réessayer.</p> : null}
      </form>
    </section>
  );
}
