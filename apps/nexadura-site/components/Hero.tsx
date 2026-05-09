"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";

const workflow = [
  "Lead Capture",
  "AI Qualification",
  "CRM Routing",
  "Follow-up Automation",
  "Performance Dashboard",
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-32">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_30%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-300">
            <Zap size={16} /> AI automation infrastructure for scaling companies
          </div>
          <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
            AI Systems That Eliminate Operational Bottlenecks
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
            Nexadura designs automation and intelligence infrastructure that helps companies move faster, reduce manual work, and scale with clearer execution.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/automation-audit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 px-7 py-4 font-semibold text-white transition hover:bg-blue-400"
            >
              Get an Automation Audit <ArrowRight size={18} />
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-7 py-4 font-semibold text-white transition hover:bg-slate-900"
            >
              View Solutions
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-blue-950/30"
        >
          <div className="rounded-2xl bg-slate-950 p-5">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm text-slate-400">Operational System Map</span>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">Live Architecture</span>
            </div>
            <div className="space-y-4">
              {workflow.map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-sm text-blue-300">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item}</div>
                    <div className="text-sm text-slate-500">Connected workflow layer</div>
                  </div>
                  <CheckCircle2 className="text-emerald-400" size={20} />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}