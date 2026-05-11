import { services } from "@/data/services";

export default function Solutions() {
  return (
    <section className="section-shell py-16">
      <p className="eyebrow">Système opérationnel</p>
      <h2 className="mt-4 max-w-3xl text-3xl font-black md:text-4xl">La première version reste volontairement pratique : capturer, qualifier, stocker, alerter, suivre, mesurer.</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {services.map(({ id, title, description }) => (
          <article key={title} className="rounded-2xl rounded-bl-md border border-line bg-[#0b0b0a]/85 p-5">
            <p className="text-sm font-black text-signal">{id}</p>
            <h3 className="mt-4 text-lg font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}