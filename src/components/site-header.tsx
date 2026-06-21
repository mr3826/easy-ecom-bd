import Link from "next/link";
import { getSettings } from "@/server/store";
import { ShoppingCart, Store } from "lucide-react";

const navLinks = [
  { href: "/products", label: "Products" },
  { href: "/track", label: "Track Order" },
  { href: "/login", label: "Login" },
  { href: "/admin", label: "Admin" },
];

export function SiteHeader() {
  const settings = getSettings();

  return (
    <header className="border-b border-black/5 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <Store className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              {settings.logoText}
            </span>
            <span className="block text-base font-semibold text-slate-950">
              {settings.storeName}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-slate-950">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50"
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
          </Link>
        </div>
      </div>
    </header>
  );
}
