import {
  createManualOrderAction,
  toggleOrderDeliveryAction,
  toggleOrderPaymentAction,
  updateOrderStatusAction,
} from "@/app/admin/actions";
import { deliveryStatuses, deliveryZones, orderStatuses, paymentProviders, paymentStatuses } from "@/lib/domain";
import { money, shortDate } from "@/lib/utils";
import { listOrders, listOrderStatusHistory, listProducts } from "@/server/store";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";

const orderFieldClass =
  "w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60";

export default async function AdminOrdersPage() {
  const [orders, products, history] = await Promise.all([
    listOrders(),
    listProducts(),
    listOrderStatusHistory(),
  ]);

  return (
    <div className="space-y-6 text-[color:var(--foreground)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">Orders</p>
        <h1 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)] sm:text-3xl">Order management</h1>
      </div>

      <form action={createManualOrderAction} className="grid gap-4 rounded-[2rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Create manual order</h2>
            <p className="mt-1 text-xs text-[color:var(--muted)] sm:text-sm">Draft orders do not reserve stock until moved to pending or confirmed.</p>
          </div>
          <Button type="submit">Create order</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
            <span>Customer name</span>
            <input name="customerName" required className={orderFieldClass} />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
            <span>Phone</span>
            <input name="customerPhone" required className={orderFieldClass} />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
            <span>Email</span>
            <input name="customerEmail" type="email" className={orderFieldClass} />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
            <span>District</span>
            <input name="district" required defaultValue="Dhaka" className={orderFieldClass} />
          </label>
          <label className="grid gap-2 text-sm sm:col-span-2">
            <span>Shipping address</span>
            <input name="shippingAddress" required className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Lifecycle</span>
            <select name="status" defaultValue="draft" className={orderFieldClass}>
              <option value="draft">draft</option>
              <option value="pending">pending</option>
              <option value="confirmed">confirmed</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span>Payment method</span>
            <select name="paymentProvider" defaultValue="cod" className={orderFieldClass}>
              {paymentProviders.map((provider) => <option key={provider.key} value={provider.key}>{provider.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span>Payment status</span>
            <select name="paymentStatus" defaultValue="pending" className={orderFieldClass}>
              {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span>Delivery zone</span>
            <select name="deliveryZone" defaultValue="inside_dhaka" className={orderFieldClass}>
              {deliveryZones.map((zone) => <option key={zone.key} value={zone.key}>{zone.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span>Discount</span>
            <input name="discountAmount" type="number" defaultValue={0} className={orderFieldClass} />
          </label>
           <label className="grid gap-2 text-sm sm:col-span-2">
             <span>Customer notes</span>
             <input name="notes" className={orderFieldClass} />
           </label>
           <label className="grid gap-2 text-sm sm:col-span-2">
             <span>Admin notes</span>
             <input name="adminNotes" className={orderFieldClass} />
           </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="grid gap-3 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
              <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
                <span>Product {index + 1}</span>
                <select name="productId" defaultValue="" className={orderFieldClass}>
                  <option value="">Select product</option>
                  {products.filter((product) => product.isActive && !product.archivedAt).map((product) => (
                    <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
                <span>Quantity</span>
                <input name="quantity" type="number" min={1} defaultValue={index === 0 ? 1 : 0} className={orderFieldClass} />
              </label>
            </div>
          ))}
        </div>
      </form>

      <div className="space-y-4">
        {orders.map((order) => {
          const paymentLabel = order.paymentProvider ?? "cod";
          const orderHistory = history.filter((entry) => entry.orderId === order.id).slice(0, 4);

          return (
            <div key={order.id} className="rounded-[2rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[color:var(--foreground)]">{order.orderCode}</h2>
                  <p className="mt-1 text-xs text-[color:var(--muted)] sm:text-sm">{order.customerName} · {order.customerPhone} · {order.district} · {shortDate(order.createdAt)}</p>
                  <p className="mt-1 text-xs text-[color:var(--muted)] sm:text-sm">{order.shippingAddress}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Payment: {paymentLabel} · Zone: {order.deliveryZone}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label={order.status} tone={order.status} />
                  <StatusPill label={order.paymentStatus} tone={order.paymentStatus} />
                  <StatusPill label={order.deliveryStatus} tone={order.deliveryStatus} />
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,260px)]">
                <div className="rounded-3xl border border-[color:var(--border)] bg-white p-4">
                  <p className="text-sm font-medium text-[color:var(--muted)]">Items</p>
                  <ul className="mt-3 space-y-2 text-sm text-[color:var(--muted)]">
                    {order.items.map((item) => {
                      const product = products.find((entry) => entry.id === item.productId);
                      return (
                        <li key={item.id}>
                          {product?.name} x {item.quantity} · {money(item.lineTotal)}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-4 space-y-1 text-sm text-[color:var(--muted)]">
                    <p>Subtotal: {money(order.subtotal)}</p>
                    <p>Delivery: {money(order.deliveryCharge)}</p>
                    <p>Total: {money(order.total)}</p>
                    {order.notes && <p>Customer note: {order.notes}</p>}
                    {order.adminNotes && <p>Admin note: {order.adminNotes}</p>}
                  </div>
                </div>

                <div className="grid gap-3 rounded-3xl border border-[color:var(--border)] bg-white p-4 sm:grid-cols-2">
                  <form action={updateOrderStatusAction} className="space-y-3">
                    <input type="hidden" name="orderId" value={order.id} />
                    <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
                      <span>Lifecycle</span>
                      <select name="status" defaultValue={order.status} className={orderFieldClass}>
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <input name="note" placeholder="Status note" className={orderFieldClass} />
                    <Button pendingWhileSubmitting pendingLabel="Saving…">Save lifecycle</Button>
                  </form>

                  <form action={toggleOrderPaymentAction} className="space-y-3">
                    <input type="hidden" name="orderId" value={order.id} />
                    <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
                      <span>Payment status</span>
                      <select name="status" defaultValue={order.paymentStatus} className={orderFieldClass}>
                        {paymentStatuses.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <Button pendingWhileSubmitting pendingLabel="Saving…">Save payment</Button>
                  </form>

                  <form action={toggleOrderDeliveryAction} className="space-y-3">
                    <input type="hidden" name="orderId" value={order.id} />
                    <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
                      <span>Delivery status</span>
                      <select name="status" defaultValue={order.deliveryStatus} className={orderFieldClass}>
                        {deliveryStatuses.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <Button pendingWhileSubmitting pendingLabel="Saving…">Save delivery</Button>
                  </form>
                </div>

                <div className="rounded-3xl border border-[color:var(--border)] bg-white p-4">
                  <p className="text-sm font-medium text-[color:var(--muted)]">Status history</p>
                  {orderHistory.length > 0 && (
                    <div className="mt-3">
                      <div className="space-y-2 text-xs text-[color:var(--muted)]">
                        {orderHistory.map((entry) => (
                          <p key={entry.id}>
                            {entry.fromStatus ?? "new"} → {entry.toStatus} · {shortDate(entry.createdAt)}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {!orderHistory.length && <p className="mt-3 text-sm text-[color:var(--muted)]">No status updates yet.</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
