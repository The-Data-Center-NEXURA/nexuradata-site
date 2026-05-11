import { problems } from "@/data/problems";

export default function Problems() {
  return (
    <section className="border-y border-line py-16">
      <div className="section-shell grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow">La friction opérationnelle</p>
          <h2 className="mt-4 text-3xl font-black md:text-4xl">L'automatisation échoue quand le flux de travail est flou.</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {problems.map((problem) => (
            <article key={problem} className="rounded-2xl rounded-bl-md border border-line bg-[#0b0b0a]/85 p-5">
              <p className="leading-7 text-muted">{problem}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}