"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { brand, trustSignals } from "@/lib/constants";

export default function Hero() {
  return (
    <section className="section-shell grid gap-10 py-16 md:grid-cols-[1.2fr_0.8fr] md:py-24">
      <div>
        <p className="eyebrow">Automation audit and implementation</p>
        <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[1.02] tracking-normal md:text-7xl">{brand.headline}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{brand.subheadline}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/automation-audit" className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl rounded-bl-md bg-ink px-5 py-3 font-semibold text-paper">
            {brand.primaryCta}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/services" className="focus-ring inline-flex items-center justify-center rounded-xl rounded-bl-md border border-line px-5 py-3 font-semibold">
            {brand.secondaryCta}
          </Link>
        </div>
      </div>
      <motion.aside
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="self-start rounded-2xl rounded-bl-md border border-line bg-white/55 p-6 shadow-panel"
      >
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-signal">Audit output</p>
        <div className="mt-5 space-y-4">
          {trustSignals.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 text-sm font-medium">
              <Icon size={19} className="text-signal" aria-hidden="true" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </motion.aside>
    </section>
  );
}