import type { Metadata } from "next";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TrackedLink from "@/components/TrackedLink";

export const metadata: Metadata = {
  title: "Contactez NEXURA",
  description: "Contactez NEXURA pour parler d'un blocage de flux, d'une question d'automatisation IA ou d'un mandat possible.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contactez NEXURA | Parler de votre flux opérationnel",
    description: "Envoyez le contexte de votre flux, vos outils et le blocage à résoudre. NEXURA recommandera la prochaine étape utile.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <section className="section-shell py-16">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight">Dites-nous où le flux de travail bloque.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">Partagez la pile actuelle, le volume de demandes et la contrainte opérationnelle. La réponse visera la prochaine action pratique.</p>
      </section>
      <section className="section-shell py-16">
        <p className="eyebrow">À envoyer</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-black md:text-4xl">Un bon message explique le flux, les outils et l'urgence.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            "Le point où les demandes ralentissent ou disparaissent.",
            "Les outils impliqués : formulaire, courriel, CRM, calendrier, dashboard.",
            "La prochaine décision à prendre : audit, scoping, réponse simple ou mandat.",
          ].map((item) => (
            <article key={item} className="rounded-2xl rounded-bl-md border border-line bg-[#0b0b0a]/85 p-5">
              <p className="leading-7 text-muted">{item}</p>
            </article>
          ))}
        </div>
        <TrackedLink href="/automation-audit" className="focus-ring mt-8 inline-flex text-sm font-bold text-signal underline decoration-line underline-offset-4" eventName="cta_click" eventLabel="Aller directement à l'audit d'automatisation" eventLocation="contact_context">
          Aller directement à l'audit d'automatisation
        </TrackedLink>
      </section>
      <AuditForm formType="contact" />
      <Footer />
    </>
  );
}