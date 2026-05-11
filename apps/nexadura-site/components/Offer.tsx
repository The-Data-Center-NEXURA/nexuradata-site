import { auditOffer } from "@/lib/constants";

export default function Offer() {
  return (
    <section className="section-shell py-16">
      <div className="grid gap-8 rounded-2xl rounded-bl-md border border-line bg-[#0b0b0a]/85 p-6 shadow-panel md:grid-cols-[0.85fr_1.15fr] md:p-9">
        <div>
          <p className="eyebrow">Offre</p>
          <h2 className="mt-4 text-3xl font-black md:text-4xl">{auditOffer.title}</h2>
          <p className="mt-4 text-lg font-bold text-signal">{auditOffer.price}</p>
          <p className="mt-5 leading-7 text-muted">{auditOffer.description}</p>
        </div>
        <div className="grid gap-3">
          {auditOffer.deliverables.map((deliverable) => (
            <p key={deliverable} className="rounded-xl rounded-bl-md border border-line bg-[#11100e] p-4 text-sm font-semibold leading-6">
              {deliverable}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}