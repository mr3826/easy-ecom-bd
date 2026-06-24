import Link from "next/link";
import type { ReactNode } from "react";
import { getSettings } from "@/server/store";
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
  ArrowLeftRight,
} from "lucide-react";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/brands", label: "Brands", icon: Boxes },
  { href: "/admin/inventory", label: "Inventory", icon: ArrowLeftRight },
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-r border-white/10 bg-slate-950 px-5 py-6">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{settings.logoText}</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">{settings.storeName}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Merchant dashboard for products, orders, payments, and landing pages.
            </p>
          </div>
          <nav className="space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_55%)]">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
