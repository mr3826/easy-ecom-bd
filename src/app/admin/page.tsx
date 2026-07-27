import Link from "next/link";
import { MetricCard } from "@/components/metric-card";
import { StatusPill } from "@/components/status-pill";
import { getState, listOrders, listProducts, listPayments } from "@/server/store";
import { money } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const [state, orders, products, payments] = await Promise.all([
    getState(),
    listOrders(),
    listProducts(),
    listPayments(),
  ]);
  const grossSales = orders.reduce((sum, order) => sum + order.total, 0);
  const pendingOrders = orders.filter((order) => order.status === "pending").length;
  const confirmedOrders = orders.filter((order) => order.status === "confirmed").length;
  const lowStockProducts = products.filter((product) => product.stock <= product.lowStockThreshold).length;

  return (
    <div className="space-y-6 text-[color:var(--foreground)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">Store overview</h1>
        </div>
        <Link
          href="/admin/orders"
          className="rounded-full bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent)]"
        >
          Manage orders
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Products" value={`${products.length}`} delta="Live catalog" tone="slate" />
        <MetricCard label="Orders" value={`${orders.length}`} delta={`${pendingOrders} pending, ${confirmedOrders} confirmed`} tone="emerald" />
        <MetricCard label="Revenue" value={money(grossSales)} delta="Gross sales" tone="amber" />
        <MetricCard label="Stock risk" value={`${lowStockProducts}`} delta={`${payments.length} payments tracked`} tone="sky" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-white p-6 shadow-[0_24px_80px_rgba(61,39,35,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm text-[color:var(--brand)] hover:text-[color:var(--accent)]">
              View all
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {orders.slice(0, 4).map((order) => (
              <div key={order.id} className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[color:var(--foreground)]">{order.orderCode}</p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      {order.customerName} · {money(order.total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill label={order.paymentStatus} tone={order.paymentStatus} />
                    <StatusPill label={order.status} tone={order.status} />
                    <StatusPill label={order.deliveryStatus} tone={order.deliveryStatus} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-[color:var(--border)] bg-white p-6 shadow-[0_24px_80px_rgba(61,39,35,0.06)]">
          <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Configuration</h2>
          <div className="mt-5 space-y-3 text-sm text-[color:var(--muted)]">
            <p>bKash: {state.settings.bkashEnabled ? "enabled" : "disabled"}</p>
            <p>COD: {state.settings.codEnabled ? "enabled" : "disabled"}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
