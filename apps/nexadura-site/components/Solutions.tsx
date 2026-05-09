import { services } from "@/data/site";

export default function Solutions() {
  return (
    <section id="solutions" className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">Solutions</p>
            <h2 className="max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">Infrastructure for faster execution.</h2>
          </div>
          <p className="max-w-xl text-slate-300">
            We build the automation layer between your people, tools, data, and customers.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.title} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 transition hover:border-blue-500/60">
                <Icon className="mb-6 text-blue-400" size={34} />
                <h3 className="text-2xl font-semibold">{service.title}</h3>
                <p className="mt-4 leading-7 text-slate-300">{service.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}