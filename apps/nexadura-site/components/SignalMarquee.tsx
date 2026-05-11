export default function SignalMarquee() {
  const items = [
    "CAPTURE SIGNAL",
    "TRIAGE IA",
    "ROUTAGE PIPELINE",
    "LOGIQUE D'ESCALADE",
    "SÉQUENCES DE SUIVI",
    "VISIBILITÉ COMMANDE",
    "MÉMOIRE PROCÉDURES",
    "FLUX REVENUS",
  ];

  return (
    <section className="overflow-hidden border-b border-[#f4efe3]/10 bg-[#0b0b0a] py-4">
      <div className="nx-marquee flex w-[200%] gap-10 font-mono text-[11px] uppercase tracking-[0.3em] text-[#a79c8b]">
        {[...items, ...items, ...items, ...items].map((item, index) => (
          <span key={`${item}-${index}`} className="whitespace-nowrap">
            {item} <span className="ml-10 text-[#d24a2f]">/</span>
          </span>
        ))}
      </div>
    </section>
  );
}