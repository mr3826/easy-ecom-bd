import { AlertCircle, CheckCircle2 } from "lucide-react";
import { saveSettingsAction } from "@/app/admin/actions";
import { SettingsSubmitButton } from "@/components/admin/settings-submit-button";
import { getBkashIntegrationConfig } from "@/server/integration-config";
import { getSettings } from "@/server/store";

const inputClass =
  "rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--foreground)]";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [{ saved, error }, settings] = await Promise.all([searchParams, getSettings()]);
  const bkashReady = getBkashIntegrationConfig().enabled;

  return (
    <div className="space-y-6 text-[color:var(--foreground)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">Store configuration</h1>
      </div>

      {saved === "1" ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          Store settings were saved and published.
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      <form action={saveSettingsAction} className="grid gap-5 rounded-[2rem] border border-[color:var(--border)] bg-white p-4 sm:p-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span>Store name</span>
          <input name="storeName" required defaultValue={settings.storeName} className={inputClass} />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Logo text</span>
          <input name="logoText" required defaultValue={settings.logoText} className={inputClass} />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Logo path or URL</span>
          <input
            name="logoUrl"
            inputMode="url"
            placeholder="/uploads/logo.png or https://..."
            defaultValue={settings.logoUrl ?? ""}
            className={inputClass}
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Support email</span>
          <input name="supportEmail" type="email" defaultValue={settings.supportEmail ?? ""} className={inputClass} />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Contact number</span>
          <input name="contactNumber" type="tel" required defaultValue={settings.contactNumber} className={inputClass} />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Business hours</span>
          <input name="businessHours" required defaultValue={settings.businessHours} className={inputClass} />
        </label>
        <label className="grid gap-2 text-sm md:col-span-2">
          <span>Shop address</span>
          <textarea name="address" required rows={2} defaultValue={settings.address} className={inputClass} />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Delivery areas, comma or line separated</span>
          <textarea name="deliveryAreas" required rows={4} defaultValue={settings.deliveryAreas.join("\n")} className={inputClass} />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Return/refund policy</span>
          <textarea name="returnRefundPolicy" required rows={4} defaultValue={settings.returnRefundPolicy} className={inputClass} />
        </label>
        <label className="grid gap-2 text-sm md:col-span-2">
          <span>Order confirmation message</span>
          <textarea
            name="confirmationMessageTemplate"
            required
            rows={3}
            defaultValue={settings.confirmationMessageTemplate}
            className={inputClass}
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Meta Pixel ID</span>
          <input name="metaPixelId" inputMode="numeric" defaultValue={settings.metaPixelId ?? ""} className={inputClass} />
        </label>
        <label className="grid gap-2 text-sm">
          <span>GTM container ID</span>
          <input name="gtmContainerId" placeholder="GTM-XXXXXXX" defaultValue={settings.gtmContainerId ?? ""} className={inputClass} />
        </label>
        <label className="grid gap-2 text-sm md:col-span-2">
          <span>Free delivery threshold</span>
          <input
            name="freeDeliveryThreshold"
            type="number"
            required
            min={0}
            step={1}
            defaultValue={settings.freeDeliveryThreshold}
            className={inputClass}
          />
        </label>

        <fieldset className="grid gap-3 rounded-3xl border border-[color:var(--border)] bg-white p-4 md:col-span-2">
          <legend className="px-1 font-semibold text-[color:var(--foreground)]">Payment methods</legend>
          <label className="flex items-center gap-3 text-sm">
            <input name="codEnabled" type="checkbox" defaultChecked={settings.codEnabled} /> COD enabled
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              name="bkashEnabled"
              type="checkbox"
              disabled={!bkashReady}
              defaultChecked={settings.bkashEnabled && bkashReady}
            />
            {bkashReady ? "bKash enabled" : "bKash unavailable until gateway credentials are configured"}
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <input name="bkashAccountNumber" aria-label="bKash account number" placeholder="bKash account/merchant number" defaultValue={settings.bkashAccountNumber ?? ""} className={inputClass} />
            <input name="bkashInstructions" aria-label="bKash instructions" placeholder="bKash instructions" defaultValue={settings.bkashInstructions} className={inputClass} />
          </div>
        </fieldset>

        <fieldset className="grid gap-3 rounded-3xl border border-[color:var(--border)] bg-white p-4 md:col-span-2">
          <legend className="px-1 font-semibold text-[color:var(--foreground)]">Delivery zones</legend>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-2 text-sm">
              <span>Inside Dhaka charge</span>
              <input name="insideDhakaDeliveryCharge" type="number" required min={0} step={1} defaultValue={settings.insideDhakaDeliveryCharge} className={inputClass} />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Sub-Dhaka charge</span>
              <input name="subDhakaDeliveryCharge" type="number" required min={0} step={1} defaultValue={settings.subDhakaDeliveryCharge} className={inputClass} />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Outside Dhaka charge</span>
              <input name="outsideDhakaDeliveryCharge" type="number" required min={0} step={1} defaultValue={settings.outsideDhakaDeliveryCharge} className={inputClass} />
            </label>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input name="insideDhakaCodEnabled" type="checkbox" defaultChecked={settings.insideDhakaCodEnabled} /> COD inside Dhaka
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input name="subDhakaCodEnabled" type="checkbox" defaultChecked={settings.subDhakaCodEnabled} /> COD Sub-Dhaka
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input name="outsideDhakaCodEnabled" type="checkbox" defaultChecked={settings.outsideDhakaCodEnabled} /> COD outside Dhaka
          </label>
        </fieldset>

        <SettingsSubmitButton />
      </form>
    </div>
  );
}
