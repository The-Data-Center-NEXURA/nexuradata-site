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