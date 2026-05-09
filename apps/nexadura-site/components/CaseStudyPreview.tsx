type CaseStudy = {
  title: string;
  metric: string;
  summary: string;
};

export function CaseStudyPreview({ studies }: { studies: CaseStudy[] }) {
  return (
    <section className="section-shell py-16">
      <p className="eyebrow">Proof patterns</p>
      <h2 className="mt-4 max-w-3xl text-3xl font-black md:text-4xl">Case studies are framed around operational before-and-after, not vanity automation.</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {studies.map((study) => (
          <article key={study.title} className="rounded-2xl rounded-bl-md border border-line bg-white/45 p-5">
            <p className="text-sm font-black text-signal">{study.metric}</p>
            <h3 className="mt-4 text-lg font-black">{study.title}</h3>
            <p className="mt-3 text-sm leading-6 text-muted">{study.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}