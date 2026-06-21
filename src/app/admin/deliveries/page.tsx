import { syncShipmentStatusAction } from "@/app/admin/actions";
import { listDeliveryShipments } from "@/server/store";
import { deliveryStatuses } from "@/lib/domain";
import { StatusPill } from "@/components/status-pill";

export default function AdminDeliveriesPage() {
  const shipments = listDeliveryShipments();

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Deliveries</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Delivery status management</h1>
      </div>
      <div className="space-y-4">
        {shipments.map((shipment) => (
          <div key={shipment.id} className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{shipment.trackingId}</h2>
                <p className="mt-1 text-sm text-slate-400">{shipment.courierKey} · {shipment.customerName} · {shipment.customerPhone}</p>
              </div>
              <StatusPill label={shipment.status} tone={shipment.status} />
            </div>
            <p className="mt-3 text-sm text-slate-300">{shipment.customerAddress}</p>
            <form action={syncShipmentStatusAction} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="shipmentId" value={shipment.id} />
              <label className="grid gap-2 text-sm">
                <span>Sync status</span>
                <select name="status" defaultValue={shipment.status} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
                  {deliveryStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">Update</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

