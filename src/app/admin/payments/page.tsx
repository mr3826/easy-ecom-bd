import { listPayments, listOrders, getState } from "@/server/store";
import { StatusPill } from "@/components/status-pill";
import { money, shortDate } from "@/lib/utils";

export default async function AdminPaymentsPage() {
  const [payments, orders, state] = await Promise.all([listPayments(), listOrders(), getState()]);

  return (
    <div className="space-y-6 text-[color:var(--foreground)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">Payments</p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">Payment status management</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {payments.map((payment) => {
          const order = orders.find((entry) => entry.id === payment.orderId);
          return (
            <div key={payment.id} className="rounded-3xl border border-[color:var(--border)] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[color:var(--foreground)]">{payment.transactionId}</h2>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">{payment.provider} · {shortDate(payment.updatedAt)}</p>
                </div>
                <StatusPill label={payment.status} tone={payment.status} />
              </div>
              <p className="mt-3 text-sm text-[color:var(--muted)]">Order: {order?.orderCode}</p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">Amount: {money(payment.amount)}</p>
              <pre className="mt-4 overflow-auto rounded-3xl bg-[color:var(--surface-soft)] p-4 text-xs text-[color:var(--muted)]">
                {JSON.stringify(payment.rawResponse, null, 2)}
              </pre>
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 rounded-[2rem] border border-[color:var(--border)] bg-white p-5 sm:grid-cols-2">
        {[
          { name: "COD", enabled: state.settings.codEnabled, account: "Zone controlled", instructions: "Collected during delivery" },
          { name: "bKash", enabled: state.settings.bkashEnabled, account: state.settings.bkashAccountNumber, instructions: state.settings.bkashInstructions },
        ].map((method) => (
          <div key={method.name} className="rounded-3xl border border-[color:var(--border)] bg-white p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-[color:var(--foreground)]">{method.name}</p>
              <StatusPill label={method.enabled ? "visible" : "hidden"} tone={method.enabled ? "active" : "inactive"} />
            </div>
            <p className="mt-3 text-[color:var(--muted)]">{method.account || "No account number set"}</p>
            <p className="mt-2 text-[color:var(--muted)]">{method.instructions || "No instructions set"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
