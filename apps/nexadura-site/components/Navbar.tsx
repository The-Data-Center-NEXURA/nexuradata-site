import Link from "next/link";
import TrackedLink from "@/components/TrackedLink";
import { brand, navItems } from "@/lib/constants";

export default function Navbar() {
  return (
    <header className="border-b border-line bg-[#050505]/90 backdrop-blur">
      <nav className="section-shell flex min-h-16 items-center justify-between gap-6 py-4" aria-label="Navigation principale">
        <Link href="/" className="focus-ring text-sm font-black tracking-[0.18em]">
          {brand.name}
        </Link>
        <div className="hidden items-center gap-5 text-sm text-muted md:flex">
          {navItems.map((item) => (
            <TrackedLink key={item.href} href={item.href} className="focus-ring hover:text-paper" eventName="nav_click" eventLabel={item.label} eventLocation="header">
              {item.label}
            </TrackedLink>
          ))}
        </div>
        <TrackedLink href="/automation-audit" className="focus-ring rounded-xl rounded-bl-md bg-signal px-4 py-2 text-sm font-semibold text-ink" eventName="cta_click" eventLabel="Audit" eventLocation="header">
          Audit
        </TrackedLink>
        <details className="group relative md:hidden">
          <summary className="focus-ring cursor-pointer list-none rounded-xl rounded-bl-md border border-line px-4 py-2 text-sm font-semibold text-paper marker:hidden">
            Menu
          </summary>
          <div className="absolute right-0 z-20 mt-3 grid min-w-56 gap-2 rounded-2xl rounded-bl-md border border-line bg-[#0a0908] p-3 text-sm text-muted shadow-panel">
            {navItems.map((item) => (
              <TrackedLink key={item.href} href={item.href} className="focus-ring rounded-xl rounded-bl-md px-3 py-2 hover:text-paper" eventName="nav_click" eventLabel={item.label} eventLocation="mobile_menu">
                {item.label}
              </TrackedLink>
            ))}
          </div>
        </details>
      </nav>
    </header>
  );
}