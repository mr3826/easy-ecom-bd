import { listPayments, listOrders, getState } from "@/server/store";
import { StatusPill } from "@/components/status-pill";
import { money, shortDate } from "@/lib/utils";

export default async function AdminPaymentsPage() {
  const [payments, orders, state] = await Promise.all([listPayments(), listOrders(), getState()]);

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Payments</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Payment status management</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {payments.map((payment) => {
          const order = orders.find((entry) => entry.id === payment.orderId);
          return (
            <div key={payment.id} className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">{payment.transactionId}</h2>
                  <p className="mt-1 text-sm text-slate-400">{payment.provider} · {shortDate(payment.updatedAt)}</p>
                </div>
                <StatusPill label={payment.status} tone={payment.status} />
              </div>
              <p className="mt-4 text-sm text-slate-300">Order: {order?.orderCode}</p>
              <p className="mt-2 text-sm text-slate-300">Amount: {money(payment.amount)}</p>
              <pre className="mt-4 overflow-auto rounded-3xl bg-slate-950/80 p-4 text-xs text-slate-300">
                {JSON.stringify(payment.rawResponse, null, 2)}
              </pre>
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { name: "COD", enabled: state.settings.codEnabled, account: "Zone controlled", instructions: "Collected during delivery" },
          { name: "bKash", enabled: state.settings.bkashEnabled, account: state.settings.bkashAccountNumber, instructions: state.settings.bkashInstructions },
          { name: "Nagad", enabled: state.settings.nagadEnabled, account: state.settings.nagadAccountNumber, instructions: state.settings.nagadInstructions },
          { name: "Rocket", enabled: state.settings.rocketEnabled, account: state.settings.rocketAccountNumber, instructions: state.settings.rocketInstructions },
        ].map((method) => (
          <div key={method.name} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-white">{method.name}</p>
              <StatusPill label={method.enabled ? "visible" : "hidden"} tone={method.enabled ? "active" : "inactive"} />
            </div>
            <p className="mt-3 text-slate-400">{method.account || "No account number set"}</p>
            <p className="mt-2 text-slate-500">{method.instructions || "No instructions set"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
