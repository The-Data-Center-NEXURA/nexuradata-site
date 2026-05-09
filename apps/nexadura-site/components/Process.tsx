import { process } from "@/data/site";

export default function Process() {
  return (
    <section id="process" className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">Process</p>
        <h2 className="mb-12 text-3xl font-bold tracking-tight md:text-5xl">From bottleneck to deployed system.</h2>
        <div className="grid gap-6 md:grid-cols-4">
          {process.map((item) => (
            <div key={item.step} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="mb-8 text-sm font-bold text-blue-400">{item.step}</div>
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}