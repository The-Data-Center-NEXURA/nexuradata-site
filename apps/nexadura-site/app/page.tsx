import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Problems from "@/components/Problems";
import Solutions from "@/components/Solutions";
import Process from "@/components/Process";
import Offer from "@/components/Offer";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <Hero />
      <Problems />
      <Solutions />
      <Process />
      <Offer />
      <AuditForm />
      <Footer />
    </main>
  );
}