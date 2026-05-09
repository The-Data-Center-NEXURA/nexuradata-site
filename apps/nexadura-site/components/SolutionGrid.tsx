import type { LucideIcon } from "lucide-react";

type Solution = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function SolutionGrid({ solutions }: { solutions: Solution[] }) {
  return (
    <section className="section-shell py-16">
      <p className="eyebrow">Operating system</p>
      <h2 className="mt-4 max-w-3xl text-3xl font-black md:text-4xl">The first version is intentionally practical: capture, score, store, alert, follow up, measure.</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {solutions.map(({ icon: Icon, title, description }) => (
          <article key={title} className="rounded-2xl rounded-bl-md border border-line bg-white/45 p-5">
            <Icon size={22} className="text-signal" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}