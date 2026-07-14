import { getState } from "@/server/store";
import { money } from "@/lib/utils";

export default async function AdminReportsPage() {
  const state = await getState();
  const paidRevenue = state.orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.total, 0);
  const conversion = state.orders.length ? Math.round((state.orders.filter((order) => order.paymentStatus === "paid").length / state.orders.length) * 100) : 0;

  return (
    <div className="space-y-6 text-[color:var(--foreground)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">Reports</p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">Basic sales report</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[2rem] border border-[color:var(--border)] bg-white p-5">
          <p className="text-sm text-[color:var(--muted)]">Paid revenue</p>
          <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">{money(paidRevenue)}</p>
        </div>
        <div className="rounded-[2rem] border border-[color:var(--border)] bg-white p-5">
          <p className="text-sm text-[color:var(--muted)]">Paid order rate</p>
          <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">{conversion}%</p>
        </div>
      </div>
      <div className="rounded-[2rem] border border-[color:var(--border)] bg-white p-5 text-sm text-[color:var(--muted)]">
        Sales report uses the same order status fields that drive payment and delivery tracking.
      </div>
    </div>
  );
}
