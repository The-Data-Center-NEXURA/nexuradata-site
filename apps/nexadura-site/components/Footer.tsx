import Image from "next/image";
import Link from "next/link";

const navItems = [
  { href: "/services", label: "Services" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 text-sm text-slate-400 md:flex-row">
        <div className="max-w-xl">
          <Image src="/nexadura-logo.svg" alt="Nexadura" width={184} height={42} className="mb-4 h-7 w-auto" />
          <p>© 2026 Nexadura. AI automation and operational intelligence infrastructure.</p>
        </div>
        <div className="flex flex-wrap gap-6">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}