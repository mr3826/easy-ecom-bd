import { saveSettingsAction } from "@/app/admin/actions";
import { getSettings } from "@/server/store";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6 text-[color:var(--foreground)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">Store configuration</h1>
      </div>
      <form action={saveSettingsAction} className="grid gap-5 rounded-[2rem] border border-[color:var(--border)] bg-white p-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm"><span>Store name</span><input name="storeName" defaultValue={settings.storeName} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
        <label className="grid gap-2 text-sm"><span>Logo text</span><input name="logoText" defaultValue={settings.logoText} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
        <label className="grid gap-2 text-sm"><span>Logo URL</span><input name="logoUrl" defaultValue={settings.logoUrl ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
        <label className="grid gap-2 text-sm"><span>Support email</span><input name="supportEmail" type="email" defaultValue={settings.supportEmail ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
        <label className="grid gap-2 text-sm"><span>Contact number</span><input name="contactNumber" defaultValue={settings.contactNumber} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
        <label className="grid gap-2 text-sm"><span>Business hours</span><input name="businessHours" defaultValue={settings.businessHours} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
        <label className="grid gap-2 text-sm md:col-span-2"><span>Shop address</span><textarea name="address" rows={2} defaultValue={settings.address} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
        <label className="grid gap-2 text-sm"><span>Delivery areas, comma or line separated</span><textarea name="deliveryAreas" rows={4} defaultValue={settings.deliveryAreas.join("\n")} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
        <label className="grid gap-2 text-sm"><span>Return/refund policy</span><textarea name="returnRefundPolicy" rows={4} defaultValue={settings.returnRefundPolicy} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
        <label className="grid gap-2 text-sm md:col-span-2"><span>Order confirmation message/template</span><textarea name="confirmationMessageTemplate" rows={3} defaultValue={settings.confirmationMessageTemplate} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
        <label className="grid gap-2 text-sm"><span>Meta Pixel ID</span><input name="metaPixelId" defaultValue={settings.metaPixelId ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
        <label className="grid gap-2 text-sm"><span>GTM container ID</span><input name="gtmContainerId" defaultValue={settings.gtmContainerId ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
        <label className="grid gap-2 text-sm"><span>Legacy/default delivery charge</span><input name="deliveryCharge" type="number" defaultValue={settings.deliveryCharge} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
        <label className="grid gap-2 text-sm"><span>Free delivery threshold</span><input name="freeDeliveryThreshold" type="number" defaultValue={settings.freeDeliveryThreshold} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
        <div className="grid gap-3 rounded-3xl border border-[color:var(--border)] bg-white p-4 md:col-span-2">
          <p className="font-semibold text-[color:var(--foreground)]">Payment methods</p>
          <label className="flex items-center gap-3 text-sm"><input name="codEnabled" type="checkbox" defaultChecked={settings.codEnabled} /> COD enabled</label>
          <label className="flex items-center gap-3 text-sm"><input name="bkashEnabled" type="checkbox" defaultChecked={settings.bkashEnabled} /> bKash enabled</label>
          <div className="grid gap-3 md:grid-cols-2">
            <input name="bkashAccountNumber" placeholder="bKash account/merchant number" defaultValue={settings.bkashAccountNumber ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" />
            <input name="bkashInstructions" placeholder="bKash instructions" defaultValue={settings.bkashInstructions} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" />
          </div>
          <label className="flex items-center gap-3 text-sm"><input name="nagadEnabled" type="checkbox" defaultChecked={settings.nagadEnabled} /> Nagad enabled</label>
          <div className="grid gap-3 md:grid-cols-2">
            <input name="nagadAccountNumber" placeholder="Nagad account number" defaultValue={settings.nagadAccountNumber ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" />
            <input name="nagadInstructions" placeholder="Nagad instructions" defaultValue={settings.nagadInstructions} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" />
          </div>
          <label className="flex items-center gap-3 text-sm"><input name="rocketEnabled" type="checkbox" defaultChecked={settings.rocketEnabled} /> Rocket enabled</label>
          <div className="grid gap-3 md:grid-cols-2">
            <input name="rocketAccountNumber" placeholder="Rocket account number" defaultValue={settings.rocketAccountNumber ?? ""} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" />
            <input name="rocketInstructions" placeholder="Rocket instructions" defaultValue={settings.rocketInstructions} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" />
          </div>
        </div>
        <div className="grid gap-3 rounded-3xl border border-[color:var(--border)] bg-white p-4 md:col-span-2">
          <p className="font-semibold text-[color:var(--foreground)]">Delivery zones</p>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-2 text-sm"><span>Inside Dhaka charge</span><input name="insideDhakaDeliveryCharge" type="number" defaultValue={settings.insideDhakaDeliveryCharge} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
            <label className="grid gap-2 text-sm"><span>Sub-Dhaka charge</span><input name="subDhakaDeliveryCharge" type="number" defaultValue={settings.subDhakaDeliveryCharge} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
            <label className="grid gap-2 text-sm"><span>Outside Dhaka charge</span><input name="outsideDhakaDeliveryCharge" type="number" defaultValue={settings.outsideDhakaDeliveryCharge} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]" /></label>
          </div>
          <label className="flex items-center gap-3 text-sm"><input name="insideDhakaCodEnabled" type="checkbox" defaultChecked={settings.insideDhakaCodEnabled} /> COD inside Dhaka</label>
          <label className="flex items-center gap-3 text-sm"><input name="subDhakaCodEnabled" type="checkbox" defaultChecked={settings.subDhakaCodEnabled} /> COD Sub-Dhaka</label>
          <label className="flex items-center gap-3 text-sm"><input name="outsideDhakaCodEnabled" type="checkbox" defaultChecked={settings.outsideDhakaCodEnabled} /> COD outside Dhaka</label>
        </div>
        <button className="w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">Save settings</button>
      </form>
    </div>
  );
}
