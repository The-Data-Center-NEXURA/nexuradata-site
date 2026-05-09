import type { Metadata } from "next";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TrackedLink from "@/components/TrackedLink";

export const metadata: Metadata = {
  title: "À propos de NEXURA",
  description: "NEXURA conçoit des systèmes d'automatisation IA pour rendre l'accueil, les transferts, le suivi et le reporting plus faciles à piloter.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "À propos de NEXURA | Automatisation IA et systèmes opérationnels",
    description: "Méthode, principes et type de mandats pour les entreprises de services qui veulent remplacer la coordination manuelle.",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <section className="section-shell py-16">
        <p className="eyebrow">À propos</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight">De l'automatisation pour les opérateurs, pas du théâtre technologique.</h1>
        <div className="mt-8 grid gap-6 text-lg leading-8 text-muted md:grid-cols-2">
          <p>NEXURA aide les entreprises de services à transformer l'accueil, le CRM, le suivi et le reporting en systèmes plus fiables et plus simples à gérer.</p>
          <p>Le travail commence par la clarté du processus. La pile vient ensuite : champs CRM, routage, alertes, séquences de suivi, analytique et soutien à l'implantation.</p>
        </div>
      </section>
      <section className="section-shell py-16">
        <p className="eyebrow">Méthode</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-black md:text-4xl">On rend les règles opérationnelles visibles avant de brancher l'IA.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            "Cartographier le flux réel : sources, propriétaires, états, exceptions.",
            "Définir les décisions : qualification, routage, rappels, escalades.",
            "Déployer par couches : CRM, alertes, tableaux de bord, agents internes.",
          ].map((item) => (
            <article key={item} className="rounded-2xl rounded-bl-md border border-line bg-[#0b0b0a]/85 p-5">
              <p className="leading-7 text-muted">{item}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 text-sm font-bold sm:flex-row">
          <TrackedLink href="/automation-audit" className="focus-ring text-signal underline decoration-line underline-offset-4" eventName="cta_click" eventLabel="Réserver un audit" eventLocation="about_method">
            Réserver un audit
          </TrackedLink>
          <TrackedLink href="/services" className="focus-ring text-muted underline decoration-line underline-offset-4 hover:text-paper" eventName="cta_click" eventLabel="Voir les services" eventLocation="about_method">
            Voir les services
          </TrackedLink>
        </div>
      </section>
      <AuditForm />
      <Footer />
    </>
  );
}