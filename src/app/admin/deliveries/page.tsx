import { syncShipmentStatusAction } from "@/app/admin/actions";
import { getSettings, listDeliveryShipments } from "@/server/store";
import { courierOptions, deliveryStatuses, deliveryZones } from "@/lib/domain";
import { StatusPill } from "@/components/status-pill";
import { money } from "@/lib/utils";

export default async function AdminDeliveriesPage() {
  const [shipments, settings] = await Promise.all([listDeliveryShipments(), getSettings()]);
  const zoneRows = [
    { key: "inside_dhaka", charge: settings.insideDhakaDeliveryCharge, cod: settings.insideDhakaCodEnabled },
    { key: "sub_dhaka", charge: settings.subDhakaDeliveryCharge, cod: settings.subDhakaCodEnabled },
    { key: "outside_dhaka", charge: settings.outsideDhakaDeliveryCharge, cod: settings.outsideDhakaCodEnabled },
  ];
  const providerRows = [
    { key: "pathao", enabled: settings.pathaoEnabled },
    { key: "steadfast", enabled: settings.steadfastEnabled },
    { key: "redx", enabled: settings.redxEnabled },
  ];

  return (
    <div className="space-y-6 text-[color:var(--foreground)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">Deliveries</p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">Delivery status management</h1>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-white p-5">
          <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Zone charges</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {zoneRows.map((row) => {
              const zone = deliveryZones.find((item) => item.key === row.key);
              return (
                <div key={row.key} className="rounded-3xl border border-[color:var(--border)] bg-white p-4">
                  <p className="font-semibold text-[color:var(--foreground)]">{zone?.name}</p>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">{money(row.charge)}</p>
                  <StatusPill label={row.cod ? "COD allowed" : "COD off"} tone={row.cod ? "active" : "inactive"} />
                </div>
              );
            })}
          </div>
        </section>
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-white p-5">
          <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Courier readiness</h2>
          <div className="mt-4 space-y-3">
            {providerRows.map((row) => {
              const provider = courierOptions.find((item) => item.key === row.key);
              return (
                <div key={row.key} className="flex items-center justify-between gap-3 rounded-3xl border border-[color:var(--border)] bg-white p-4">
                  <p className="font-semibold text-[color:var(--foreground)]">{provider?.name}</p>
                  <StatusPill label={row.enabled ? "enabled" : "disabled"} tone={row.enabled ? "active" : "inactive"} />
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <div className="space-y-4">
        {shipments.map((shipment) => (
          <div key={shipment.id} className="rounded-[2rem] border border-[color:var(--border)] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--foreground)]">{shipment.trackingId}</h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">{shipment.courierKey} · {shipment.customerName} · {shipment.customerPhone}</p>
              </div>
              <StatusPill label={shipment.status} tone={shipment.status} />
            </div>
            <p className="mt-3 text-sm text-[color:var(--muted)]">{shipment.customerAddress}</p>
            <form action={syncShipmentStatusAction} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="shipmentId" value={shipment.id} />
              <label className="grid gap-2 text-sm">
                <span>Sync status</span>
                <select name="status" defaultValue={shipment.status} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]">
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
