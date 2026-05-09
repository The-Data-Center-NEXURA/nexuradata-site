import { CheckCircle2 } from "lucide-react";

type Offer = {
  title: string;
  price: string;
  description: string;
  deliverables: string[];
};

export function OfferSection({ offer }: { offer: Offer }) {
  return (
    <section className="section-shell py-16">
      <div className="grid gap-8 rounded-2xl rounded-bl-md border border-line bg-white/55 p-6 shadow-panel md:grid-cols-[0.8fr_1.2fr] md:p-9">
        <div>
          <p className="eyebrow">Offer</p>
          <h2 className="mt-4 text-3xl font-black">{offer.title}</h2>
          <p className="mt-2 font-semibold text-signal">{offer.price}</p>
          <p className="mt-5 leading-7 text-muted">{offer.description}</p>
        </div>
        <ul className="grid gap-3">
          {offer.deliverables.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-6">
              <CheckCircle2 size={18} className="mt-1 shrink-0 text-signal" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}