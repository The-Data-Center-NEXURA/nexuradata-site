"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { trackConversion } from "@/lib/analytics";

type AuditFormProps = {
  formType?: "contact" | "audit";
};

const inputClass = "focus-ring w-full rounded-xl rounded-bl-md border border-line bg-[#11100e] px-4 py-3 text-sm text-paper placeholder:text-muted";

export default function AuditForm({ formType = "audit" }: AuditFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    const form = event.currentTarget;
    const payload = new FormData(form);
    const formData = { ...Object.fromEntries(payload.entries()), formType, consent: payload.get("consent") === "on" };

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      const result = await response.json();
      trackConversion("lead_form_submit", { form_type: formType, lead_score: result.leadScore, lead_tier: result.leadTier });
      form.reset();
      setStatus("success");
    } else {
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
      <form onSubmit={submit} className="grid gap-4 rounded-2xl rounded-bl-md border border-line bg-[#0b0b0a]/85 p-5 shadow-panel">
        <div className="grid gap-4 sm:grid-cols-2">
          <input className={inputClass} name="fullName" placeholder="Nom complet" required />
          <input className={inputClass} name="email" placeholder="Courriel professionnel" type="email" required />
          <input className={inputClass} name="company" placeholder="Entreprise" required />
          <input className={inputClass} name="website" placeholder="Site web" />
          <input className={inputClass} name="role" placeholder="Rôle" />
          <select className={inputClass} name="teamSize" required defaultValue="">
            <option value="" disabled>
              Taille de l'équipe
            </option>
            <option value="1-5">1-5</option>
            <option value="6-20">6-20</option>
            <option value="21-50">21-50</option>
            <option value="51-200">51-200</option>
            <option value="200+">200+</option>
          </select>
          <select className={inputClass} name="monthlyLeadVolume" required defaultValue="">
            <option value="" disabled>
              Volume mensuel de demandes
            </option>
            <option value="0-25">0-25</option>
            <option value="26-100">26-100</option>
            <option value="101-500">101-500</option>
            <option value="500+">500+</option>
          </select>
          <select className={inputClass} name="timeline" required defaultValue="">
            <option value="" disabled>
              Échéancier
            </option>
            <option value="now">Maintenant</option>
            <option value="30-days">Dans les 30 prochains jours</option>
            <option value="quarter">Ce trimestre</option>
            <option value="exploring">En exploration</option>
          </select>
          <select className={inputClass} name="budget" required defaultValue="">
            <option value="" disabled>
              Fourchette budgétaire
            </option>
            <option value="under-2k">Moins de 2 k$</option>
            <option value="2k-5k">2 k$ à 5 k$</option>
            <option value="5k-15k">5 k$ à 15 k$</option>
            <option value="15k+">15 k$ et plus</option>
            <option value="unknown">À confirmer</option>
          </select>
          <input className={inputClass} name="currentStack" placeholder="CRM / outils actuels" required />
        </div>
        <textarea className={`${inputClass} min-h-32 resize-y`} name="biggestConstraint" placeholder="Où le flux de travail bloque-t-il aujourd'hui?" required />
        <label className="flex gap-3 text-sm leading-6 text-muted">
          <input className="mt-1" type="checkbox" name="consent" required />
          <span>J'accepte d'être contacté au sujet de cette demande.</span>
        </label>
        <button className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl rounded-bl-md bg-signal px-5 py-3 font-semibold text-ink disabled:opacity-60" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Envoi..." : "Envoyer la demande"}
          <Send size={17} aria-hidden="true" />
        </button>
        {status === "success" ? <p className="text-sm font-semibold text-signal">Demande reçue. Nous allons revoir le contexte du flux et répondre avec la prochaine étape.</p> : null}
        {status === "error" ? <p className="text-sm font-semibold text-red-700">La demande n'a pas pu être envoyée. Veuillez réessayer.</p> : null}
      </form>
    </section>
  );
}