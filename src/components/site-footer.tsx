import Link from "next/link";
import { Home, MessageCircleMore, Phone, ShoppingBag, Store } from "lucide-react";
import { SiteLogo } from "@/components/site-logo";
import { getSettings } from "@/server/store";
import { storefrontPrimaryNav } from "@/lib/bornohin-storefront";
import { getStorefrontCategoryRail } from "@/server/storefront-catalog";
import { siteBrand } from "@/lib/site-brand";

export async function SiteFooter() {
  // The category list is read from the real catalogue, not from the hardcoded
  // template it used to slice, so the footer cannot advertise categories the
  // store does not have.
  const [settings, categoryRail] = await Promise.all([getSettings(), getStorefrontCategoryRail()]);
  const categoryLinks = categoryRail.slice(0, 6);

  return (
    <footer className="border-t border-[color:var(--border)] bg-[color:var(--footer-background)] text-[color:var(--footer-foreground)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_0.9fr_0.9fr] lg:px-8">
        <div>
          <div className="flex items-center gap-4">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-white p-2 shadow-[0_16px_34px_rgba(0,0,0,0.16)]">
              <SiteLogo logoUrl={settings.logoUrl} size={128} className="h-full w-full object-contain" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white">{settings.storeName}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.34em] text-[color:var(--footer-muted)]">{siteBrand.tagline}</p>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm leading-7 text-[color:var(--footer-muted)]">
            Discover premium quality with {settings.storeName}. We bring you the finest collection of trending styles and comfortable wear, designed to make you stand out.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">COD ready</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Mobile-first</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Delivery zones</span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-white">Quick Links</h2>
          <div className="mt-4 grid gap-3 text-sm text-[color:var(--footer-muted)]">
            {storefrontPrimaryNav.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-white">
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="transition hover:text-white">
              Login
            </Link>
            <Link href="/account" className="transition hover:text-white">
              Account
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-white">Categories</h2>
          <div className="mt-4 grid gap-3 text-sm text-[color:var(--footer-muted)]">
            {categoryLinks.map((category) => (
              <Link key={category.href} href={category.href} className="transition hover:text-white">
                {category.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-[color:var(--footer-muted)] sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-white">Get In Touch</h2>
            <p className="mt-3 max-w-2xl leading-7">{settings.address}</p>
            <p className="mt-2">{settings.businessHours}</p>
            <p className="mt-2">{settings.deliveryAreas.join(" | ")}</p>
            <div className="mt-3 flex flex-wrap gap-4">
              <a href={`tel:${settings.contactNumber.replace(/\D/g, "")}`} className="transition hover:text-white">
                {settings.contactNumber}
              </a>
              <a href={`mailto:${settings.supportEmail ?? siteBrand.supportEmail}`} className="transition hover:text-white">
                {settings.supportEmail ?? siteBrand.supportEmail}
              </a>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white">{settings.storeName}</p>
            <p className="mt-3">© 2026 {settings.storeName}. All rights reserved.</p>
            <p className="mt-2">
              Developed by{" "}
              <a href={siteBrand.techProvider.url} target="_blank" rel="noreferrer" className="font-semibold text-white transition hover:underline">
                {siteBrand.techProvider.name}
              </a>
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-3 text-xs uppercase tracking-[0.22em]">
              <Link href="/privacy" className="transition hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="transition hover:text-white">
                Terms of Service
              </Link>
              <Link href="/cookie-policy" className="transition hover:text-white">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[color:var(--footer-background)] sm:hidden">
        <nav className="safe-bottom grid grid-cols-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--footer-foreground)]">
          <a href={`tel:${settings.contactNumber.replace(/\D/g, "")}`} className="flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-center transition hover:text-white" aria-label="Call store support">
            <Phone className="h-5 w-5" aria-hidden="true" />
            <span>Call</span>
          </a>
          <a href={siteBrand.messengerUrl} className="flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-center transition hover:text-white" aria-label="Open Messenger">
            <MessageCircleMore className="h-5 w-5" aria-hidden="true" />
            <span>Chat</span>
          </a>
          <Link href="/" className="flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-center transition hover:text-white" aria-label="Go to home">
            <Home className="h-5 w-5" aria-hidden="true" />
            <span>Home</span>
          </Link>
          <Link href="/shop" className="flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-center transition hover:text-white" aria-label="Browse shop">
            <Store className="h-5 w-5" aria-hidden="true" />
            <span>Shop</span>
          </Link>
          <Link href="/cart" className="flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-center transition hover:text-white" aria-label="Open cart">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <span>Cart</span>
          </Link>
        </nav>
      </div>
    </footer>
  );
}
