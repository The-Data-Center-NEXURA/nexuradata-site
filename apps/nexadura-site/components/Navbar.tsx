import Link from "next/link";
import { brand, navItems } from "@/lib/constants";

export default function Navbar() {
  return (
    <header className="border-b border-line bg-[#050505]/90 backdrop-blur">
      <nav className="section-shell flex min-h-16 items-center justify-between gap-6 py-4" aria-label="Main navigation">
        <Link href="/" className="focus-ring text-sm font-black tracking-[0.18em]">
          {brand.name}
        </Link>
        <div className="hidden items-center gap-5 text-sm text-muted md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="focus-ring hover:text-paper">
              {item.label}
            </Link>
          ))}
        </div>
        <Link href="/automation-audit" className="focus-ring rounded-xl rounded-bl-md bg-signal px-4 py-2 text-sm font-semibold text-ink">
          Audit
        </Link>
      </nav>
    </header>
  );
}