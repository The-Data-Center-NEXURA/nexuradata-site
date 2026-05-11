import TrackedLink from "@/components/TrackedLink";
import { brand, navItems } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-line py-10">
      <div className="section-shell grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-sm font-black tracking-[0.18em]">{brand.name}</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Automatisation IA, routage CRM, suivi et reporting pour les entreprises de services qui doivent piloter l'exécution sans chaos opérationnel.
          </p>
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          {navItems.map((item) => (
            <TrackedLink key={item.href} href={item.href} className="focus-ring hover:text-paper" eventName="nav_click" eventLabel={item.label} eventLocation="footer">
              {item.label}
            </TrackedLink>
          ))}
        </div>
      </div>
    </footer>
  );
}