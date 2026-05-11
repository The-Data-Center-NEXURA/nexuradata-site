import { processSteps } from "@/data/process";

export default function Process() {
  return (
    <section className="bg-ink py-16 text-paper">
      <div className="section-shell">
        <p className="eyebrow text-amber">Processus</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-black md:text-4xl">Construire la couche d'automatisation après avoir rendu les règles opérationnelles visibles.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {processSteps.map((step, index) => (
            <article key={step.title} className="border-t border-white/20 pt-5">
              <p className="text-sm font-black text-amber">0{index + 1}</p>
              <h3 className="mt-3 font-black">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/70">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}