import { getState } from "@/server/store";
import { money } from "@/lib/utils";

export default async function AdminReportsPage() {
  const state = await getState();
  const paidRevenue = state.orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.total, 0);
  const conversion = state.orders.length ? Math.round((state.orders.filter((order) => order.paymentStatus === "paid").length / state.orders.length) * 100) : 0;

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Reports</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Basic sales report</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Paid revenue</p>
          <p className="mt-3 text-3xl font-semibold text-white">{money(paidRevenue)}</p>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Paid order rate</p>
          <p className="mt-3 text-3xl font-semibold text-white">{conversion}%</p>
        </div>
      </div>
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
        Sales report uses the same order status fields that drive payment and delivery tracking.
      </div>
    </div>
  );
}
