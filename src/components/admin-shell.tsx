import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { getSettings } from "@/server/store";
import { siteBrand } from "@/lib/site-brand";
import {
  LayoutDashboard,
  Package,
  Tags,
  BadgePercent,
  Boxes,
  ShoppingBag,
  Users,
  Truck,
  LayoutTemplate,
  Settings2,
  WalletCards,
  CircleDollarSign,
} from "lucide-react";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products & Inventory", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/brands", label: "Brands", icon: Boxes },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: BadgePercent },
  { href: "/admin/payments", label: "Payments", icon: WalletCards },
  { href: "/admin/deliveries", label: "Deliveries", icon: Truck },
  { href: "/admin/landing-pages", label: "Landing pages", icon: LayoutTemplate },
  { href: "/admin/reports", label: "Reports", icon: CircleDollarSign },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
];

export async function AdminShell({
  children,
}: {
  children: ReactNode;
}) {
  const settings = await getSettings();
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff3de_0%,#f5efe5_34%,#eef2f6_100%)] text-[color:var(--foreground)]">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-r border-[color:var(--border)] bg-white/90 px-5 py-6 backdrop-blur">
          <div className="mb-8 rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4 shadow-[0_18px_40px_rgba(61,39,35,0.06)]">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-[color:var(--border)] bg-white p-2">
                <Image src={siteBrand.logoPath} alt="" width={96} height={96} className="h-full w-full object-contain" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--muted)]">{settings.logoText}</p>
                <h1 className="mt-1 truncate text-xl font-semibold text-[color:var(--foreground)]">{settings.storeName}</h1>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              Bornohin admin console for products, inventory, orders, and store operations.
            </p>
          </div>
          <nav className="space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium text-[color:var(--muted)] transition hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--brand)]"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="bg-transparent">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
