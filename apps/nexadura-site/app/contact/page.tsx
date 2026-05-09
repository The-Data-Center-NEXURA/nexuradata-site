import type { Metadata } from "next";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez NEXURA pour revoir où votre flux actuel de demandes, CRM, suivi ou reporting bloque.",
  alternates: { canonical: "/contact" },
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
      <AuditForm formType="contact" />
      <Footer />
    </>
  );
}