import { saveSettingsAction } from "@/app/admin/actions";
import { getSettings } from "@/server/store";

export default function AdminSettingsPage() {
  const settings = getSettings();

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Store configuration</h1>
      </div>
      <form action={saveSettingsAction} className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm"><span>Store name</span><input name="storeName" defaultValue={settings.storeName} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" /></label>
        <label className="grid gap-2 text-sm"><span>Logo text</span><input name="logoText" defaultValue={settings.logoText} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" /></label>
        <label className="grid gap-2 text-sm"><span>Contact number</span><input name="contactNumber" defaultValue={settings.contactNumber} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" /></label>
        <label className="grid gap-2 text-sm"><span>Delivery charge</span><input name="deliveryCharge" type="number" defaultValue={settings.deliveryCharge} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" /></label>
        <label className="grid gap-2 text-sm"><span>Free delivery threshold</span><input name="freeDeliveryThreshold" type="number" defaultValue={settings.freeDeliveryThreshold} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" /></label>
        <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
          <label className="flex items-center gap-3 text-sm"><input name="bkashEnabled" type="checkbox" defaultChecked={settings.bkashEnabled} /> bKash enabled</label>
          <label className="flex items-center gap-3 text-sm"><input name="nagadEnabled" type="checkbox" defaultChecked={settings.nagadEnabled} /> Nagad enabled</label>
          <label className="flex items-center gap-3 text-sm"><input name="pathaoEnabled" type="checkbox" defaultChecked={settings.pathaoEnabled} /> Pathao enabled</label>
          <label className="flex items-center gap-3 text-sm"><input name="steadfastEnabled" type="checkbox" defaultChecked={settings.steadfastEnabled} /> Steadfast enabled</label>
        </div>
        <button className="w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">Save settings</button>
      </form>
    </div>
  );
}

