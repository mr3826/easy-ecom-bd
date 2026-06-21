import { PublicShell } from "@/components/public-shell";
import { getOrderByCode, listOrders, listDeliveryShipments } from "@/server/store";
import { StatusPill } from "@/components/status-pill";

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const order = code ? getOrderByCode(code) : listOrders()[0];
  const shipment = order ? listDeliveryShipments().find((item) => item.orderId === order.id) : undefined;

  return (
    <PublicShell>
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Track order</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Search by order code</h1>
          <form className="mt-6 flex flex-wrap gap-3" action="/track" method="get">
            <input
              name="code"
              placeholder="EE-240621-1001"
              defaultValue={code ?? ""}
              className="min-w-72 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            />
            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Track</button>
          </form>

          {order ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-950 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Order</p>
                <h2 className="mt-2 text-2xl font-semibold">{order.orderCode}</h2>
                <p className="mt-3 text-sm text-slate-300">{order.customerName} · {order.customerPhone}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Payment</p>
                <div className="mt-3 flex items-center gap-3">
                  <StatusPill label={order.paymentStatus} tone={order.paymentStatus} />
                  <StatusPill label={order.deliveryStatus} tone={order.deliveryStatus} />
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  {shipment ? `Courier: ${shipment.courierKey} · Tracking: ${shipment.trackingId}` : "No shipment created yet."}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-600">No order found yet. Use a valid order code to load tracking.</p>
          )}
        </div>
      </section>
    </PublicShell>
  );
}

