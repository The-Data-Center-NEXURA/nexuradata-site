import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AuditForm from "@/components/AuditForm";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Automation Audit",
  description: "Request a focused automation audit for intake, CRM, follow-up, analytics, and lead-to-revenue workflow improvements.",
  alternates: { canonical: "/automation-audit" },
};

export default function AutomationAuditPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">Automation Audit</p>
          <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
            Find the bottlenecks slowing your revenue, operations, and execution.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Submit your company details and we&apos;ll identify where AI systems and automation can create immediate leverage.
          </p>
        </div>
      </section>
      <AuditForm />
      <Footer />
    </main>
  );
}