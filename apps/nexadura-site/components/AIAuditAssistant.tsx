import { systemStats } from "@/lib/constants";

export default function AIAuditAssistant() {
  return (
    <section className="section-shell py-16">
      <div className="rounded-2xl rounded-bl-md border border-line bg-[#11100e] p-6 md:p-9">
        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow">Assistant d'audit IA</p>
            <h2 className="mt-4 text-3xl font-black md:text-4xl">Qualifier le blocage avant de commencer l'automatisation.</h2>
            <p className="mt-5 leading-7 text-muted">L'assistant transforme le contexte d'accueil en qualification, routage, notification, stockage CRM et actions de suivi.</p>
          </div>
          <div className="rounded-2xl rounded-bl-md border border-line bg-[#050505] p-5 font-mono text-sm">
            <p className="text-signal">nexura.audit.run()</p>
            <div className="mt-5 grid gap-3">
              {systemStats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between border-b border-line pb-2">
                  <span className="text-muted">{stat.label}</span>
                  <span className="font-bold text-paper">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}