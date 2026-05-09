import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Problems from "@/components/Problems";
import Solutions from "@/components/Solutions";
import Process from "@/components/Process";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Problems />
      <Solutions />
      <Process />
      <AuditForm />
      <Footer />
    </>
  );
}