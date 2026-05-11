import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SignalMarquee from "@/components/SignalMarquee";
import Problems from "@/components/Problems";
import SystemMap from "@/components/SystemMap";
import Solutions from "@/components/Solutions";
import Offer from "@/components/Offer";
import AIAuditAssistant from "@/components/AIAuditAssistant";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Automatisation IA pour revenus et opérations",
  description:
    "NEXURA automatise l'accueil des demandes, la qualification, le routage CRM, le suivi et le reporting pour réduire les blocages opérationnels.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Automatisation IA pour revenus et opérations | NEXURA",
    description:
      "Reliez demandes entrantes, qualification, CRM, suivi et visibilité opérationnelle dans un système de commandement clair.",
    url: "/",
  },
};

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-[#f4efe3]">
      <Navbar />
      <Hero />
      <SignalMarquee />
      <Problems />
      <SystemMap />
      <Solutions />
      <Offer />
      <AIAuditAssistant />
      <AuditForm />
      <Footer />
    </main>
  );
}