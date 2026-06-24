import Link from "next/link";
import { MetricCard } from "@/components/metric-card";
import { StatusPill } from "@/components/status-pill";
import { getState, listOrders, listProducts, listPayments, listDeliveryShipments } from "@/server/store";
import { money } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const [state, orders, products, payments, shipments] = await Promise.all([
    getState(),
    listOrders(),
    listProducts(),
    listPayments(),
    listDeliveryShipments(),
  ]);
  const grossSales = orders.reduce((sum, order) => sum + order.total, 0);
  const pendingOrders = orders.filter((order) => order.status === "pending").length;
  const confirmedOrders = orders.filter((order) => order.status === "confirmed").length;
  const lowStockProducts = products.filter((product) => product.stock <= product.lowStockThreshold).length;

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Store overview</h1>
        </div>
        <Link href="/admin/orders" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">
          Manage orders
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Products" value={`${products.length}`} delta="Live catalog" tone="slate" />
        <MetricCard label="Orders" value={`${orders.length}`} delta={`${pendingOrders} pending, ${confirmedOrders} confirmed`} tone="emerald" />
        <MetricCard label="Revenue" value={money(grossSales)} delta="Gross sales" tone="amber" />
        <MetricCard label="Stock risk" value={`${lowStockProducts}`} delta={`${payments.length} payments, ${shipments.length} shipments`} tone="sky" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm text-slate-300 hover:text-white">
              View all
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {orders.slice(0, 4).map((order) => (
              <div key={order.id} className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{order.orderCode}</p>
                    <p className="mt-1 text-sm text-slate-400">{order.customerName} · {money(order.total)}</p>
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

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">Configuration</h2>
          <div className="mt-5 space-y-3 text-sm text-slate-300">
            <p>bKash: {state.settings.bkashEnabled ? "enabled" : "disabled"}</p>
            <p>Nagad: {state.settings.nagadEnabled ? "enabled" : "disabled"}</p>
            <p>Rocket: {state.settings.rocketEnabled ? "enabled" : "disabled"}</p>
            <p>COD: {state.settings.codEnabled ? "enabled" : "disabled"}</p>
            <p>Pathao: {state.settings.pathaoEnabled ? "enabled" : "disabled"}</p>
            <p>Steadfast: {state.settings.steadfastEnabled ? "enabled" : "disabled"}</p>
            <p>RedX: {state.settings.redxEnabled ? "enabled" : "disabled"}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
