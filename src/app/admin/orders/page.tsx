import { createCourierShipmentAction, toggleOrderDeliveryAction, toggleOrderPaymentAction } from "@/app/admin/actions";
import { deliveryStatuses, paymentStatuses } from "@/lib/domain";
import { money, shortDate } from "@/lib/utils";
import { listDeliveryShipments, listOrders, listProducts } from "@/server/store";
import { StatusPill } from "@/components/status-pill";

export default function AdminOrdersPage() {
  const orders = listOrders();
  const shipments = listDeliveryShipments();
  const products = listProducts();

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Orders</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Order management</h1>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const shipment = shipments.find((entry) => entry.orderId === order.id);
          return (
            <div key={order.id} className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">{order.orderCode}</h2>
                  <p className="mt-1 text-sm text-slate-400">{order.customerName} · {order.customerPhone} · {shortDate(order.createdAt)}</p>
                  <p className="mt-2 text-sm text-slate-300">{order.shippingAddress}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill label={order.paymentStatus} tone={order.paymentStatus} />
                  <StatusPill label={order.deliveryStatus} tone={order.deliveryStatus} />
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr_220px]">
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-medium text-slate-300">Items</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-400">
                    {order.items.map((item) => {
                      const product = products.find((entry) => entry.id === item.productId);
                      return <li key={item.id}>{product?.name} x {item.quantity} · {money(item.lineTotal)}</li>;
                    })}
                  </ul>
                  <p className="mt-4 text-sm text-slate-300">Total: {money(order.total)}</p>
                </div>

                <div className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-4 md:grid-cols-2">
                  <form action={toggleOrderPaymentAction} className="space-y-3">
                    <input type="hidden" name="orderId" value={order.id} />
                    <label className="grid gap-2 text-sm">
                      <span>Payment status</span>
                      <select name="status" defaultValue={order.paymentStatus} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
                        {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>
                    <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">Save payment</button>
                  </form>

                  <form action={toggleOrderDeliveryAction} className="space-y-3">
                    <input type="hidden" name="orderId" value={order.id} />
                    <label className="grid gap-2 text-sm">
                      <span>Delivery status</span>
                      <select name="status" defaultValue={order.deliveryStatus} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
                        {deliveryStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>
                    <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">Save delivery</button>
                  </form>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-medium text-slate-300">Courier</p>
                  {shipment ? (
                    <div className="mt-3 text-sm text-slate-400">
                      <p>{shipment.courierKey}</p>
                      <p>{shipment.trackingId}</p>
                    </div>
                  ) : (
                    <form action={createCourierShipmentAction} className="mt-3 space-y-3">
                      <input type="hidden" name="orderId" value={order.id} />
                      <label className="grid gap-2 text-sm">
                        <span>Courier</span>
                        <select name="courierKey" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
                          <option value="pathao">Pathao</option>
                          <option value="steadfast">Steadfast</option>
                        </select>
                      </label>
                      <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">Create parcel</button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

