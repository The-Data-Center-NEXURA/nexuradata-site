import Image from "next/image";
import Link from "next/link";

const navItems = [
  { href: "/services", label: "Services" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  return (
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <Link href="/" className="flex items-center gap-3" aria-label="Nexadura home">
        <Image src="/nexadura-logo.svg" alt="Nexadura" width={184} height={42} priority className="h-7 w-auto" />
      </Link>
      <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="hover:text-white">
            {item.label}
          </Link>
        ))}
      </div>
      <Link
        href="/automation-audit"
        className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
      >
        Get Audit
      </Link>
    </nav>
  );
}