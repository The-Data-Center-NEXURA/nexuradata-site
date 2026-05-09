export default function SystemMap() {
  const left = ["FORMULAIRE", "COURRIEL", "CALENDRIER", "CRM"];
  const center = ["TRIAGE", "AGENT", "ROUTAGE", "ESCALADE"];
  const right = ["TÂCHE", "SUIVI", "TABLEAU", "RAPPORT"];

  return (
    <section className="relative border-b border-[#f4efe3]/10 px-6 py-28 md:py-36">
      <div className="absolute inset-0 nx-grid opacity-25" />

      <div className="relative mx-auto max-w-[1600px]">
        <div className="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-[#b87333]">Architecture / couche opérationnelle</p>
            <h2 className="mt-8 max-w-5xl text-5xl font-black uppercase leading-[0.9] tracking-[-0.07em] md:text-7xl">
              Des systèmes qui gardent l'entreprise maniable pendant sa croissance.
            </h2>
          </div>

          <p className="max-w-lg text-lg leading-8 text-[#a79c8b]">
            La couche opérationnelle traverse vos outils, surveille les signaux, décide de la prochaine action et garde l'opérateur en contrôle.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr_1fr]">
          <SystemColumn title="ENTRÉES" items={left} />

          <div className="border border-[#b87333]/35 bg-[#b87333]/[0.055] p-5">
            <div className="mb-5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.24em]">
              <span className="text-[#b87333]">NOYAU NEXURA</span>
              <span className="text-[#a79c8b]">ACTIF</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {center.map((item) => (
                <div key={item} className="border border-[#f4efe3]/10 bg-[#050505] p-6">
                  <div className="h-2 w-2 bg-[#d24a2f] nx-pulse" />
                  <div className="mt-10 font-mono text-sm uppercase tracking-[0.24em] text-[#f4efe3]">{item}</div>
                </div>
              ))}
            </div>
          </div>

          <SystemColumn title="SORTIES" items={right} />
        </div>
      </div>
    </section>
  );
}

function SystemColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-[#f4efe3]/10 bg-[#0b0b0a] p-5">
      <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.24em] text-[#a79c8b]">{title}</div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item} className="border border-[#f4efe3]/10 bg-[#050505] p-5 font-mono text-xs uppercase tracking-[0.22em] text-[#f4efe3]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}