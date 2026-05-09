import Link from "next/link";
import { brand, navItems } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-line py-10">
      <div className="section-shell grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-sm font-black tracking-[0.18em]">{brand.name}</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Practical automation strategy, implementation, and measurement for service businesses with real operational constraints.
          </p>
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="focus-ring hover:text-ink">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}