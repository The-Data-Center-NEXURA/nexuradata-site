import type { Metadata } from "next";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "À propos",
  description: "NEXURA conçoit des systèmes d'automatisation pratiques pour les entreprises de services dont l'accueil, le CRM, le suivi et le reporting sont difficiles à piloter.",
  alternates: { canonical: "/about" },
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
      <AuditForm />
      <Footer />
    </>
  );
}