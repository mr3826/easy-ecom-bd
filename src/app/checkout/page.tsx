import { MessageCircleMore, PhoneCall } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { StatusPill } from "@/components/status-pill";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/server/auth";
import { getOrCreateCart, getCartSummary, getSettings } from "@/server/store";
import { checkoutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";
import { getBkashIntegrationConfig } from "@/server/integration-config";

export const dynamic = "force-dynamic";

const fieldClass =
  "w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3.5 text-sm text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60";

export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const guestKey = cookieStore.get("easy_ecom_guest")?.value ?? "guest-preview";
  const user = await getCurrentUser();
  const [cart, settings] = await Promise.all([
    getOrCreateCart(guestKey, user?.id),
    getSettings(),
  ]);
  const summary = await getCartSummary(cart);
  const bkashReady = getBkashIntegrationConfig().enabled;
  const deliveryFee = summary.subtotal >= settings.freeDeliveryThreshold ? 0 : settings.insideDhakaDeliveryCharge;
  const supportDigits = settings.contactNumber.replace(/\D/g, "");
  const paymentMethods = [
    { key: "cod", name: "Cash on Delivery", description: "Pay when the parcel arrives", enabled: settings.codEnabled },
    {
      key: "bkash",
      name: "bKash",
      description: settings.bkashInstructions || "bKash checkout after order creation",
      enabled: settings.bkashEnabled && bkashReady,
    },
  ];

  return (
    <PublicShell>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:px-8">
        <div className="rounded-[2rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">Checkout</p>
              <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[color:var(--foreground)] sm:text-3xl">Complete your order</h1>
            </div>
            <StatusPill
              label={paymentMethods.some((method) => method.enabled) ? "Payments available" : "Payments off"}
              tone={paymentMethods.some((method) => method.enabled) ? "active" : "inactive"}
            />
          </div>

          <form action={checkoutAction} className="mt-7 grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
                <span className="font-medium">Name</span>
                <input
                  name="customerName"
                  required
                  autoComplete="name"
                  defaultValue={user?.name ?? ""}
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
                <span className="font-medium">Phone</span>
                {/* type=tel + inputMode=numeric is what opens a numeric keypad
                    instead of a full QWERTY on the single most-typed field in
                    the whole funnel. */}
                <input
                  name="customerPhone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  defaultValue={user?.phone ?? ""}
                  className={fieldClass}
                />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
                <span className="font-medium">District</span>
                <input
                  name="district"
                  required
                  autoComplete="address-level1"
                  placeholder="Dhaka"
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
                <span className="font-medium">Email</span>
                <input
                  name="customerEmail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  defaultValue={user?.email ?? ""}
                  className={fieldClass}
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
              <span className="font-medium">Shipping address</span>
              <textarea
                name="shippingAddress"
                rows={4}
                required
                autoComplete="street-address"
                placeholder="House, road, area, landmark"
                className={fieldClass}
              />
            </label>

            <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
              <span className="font-medium">Coupon code</span>
              <input
                name="couponCode"
                placeholder="Optional"
                autoComplete="off"
                autoCapitalize="characters"
                className={fieldClass}
              />
            </label>

            <label className="grid gap-2 text-sm text-[color:var(--foreground)]">
              <span className="font-medium">Notes</span>
              <textarea
                name="notes"
                rows={3}
                placeholder="Delivery instructions or product note"
                className={fieldClass}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {paymentMethods.map((method, index) => (
                <label
                  key={method.key}
                  className={`flex min-h-14 items-start gap-3 rounded-3xl border p-4 transition ${
                    method.enabled ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                  } ${
                    index === 0
                      ? "border-[color:var(--brand)]/40 bg-[color:var(--brand-soft)]"
                      : "border-[color:var(--border)] bg-[color:var(--surface-soft)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.key}
                    defaultChecked={index === 0}
                    disabled={!method.enabled}
                    className="mt-1 h-4 w-4 text-[color:var(--brand)] focus:ring-[color:var(--brand)]/40"
                  />
                  <span className="grid gap-1">
                    <span className="text-sm font-semibold text-[color:var(--foreground)]">{method.name}</span>
                    <span className="text-xs leading-5 text-[color:var(--muted)]">{method.enabled ? method.description : "Disabled by shop"}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 text-xs text-[color:var(--muted)] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0">
              <span className="shrink-0 rounded-full bg-[color:var(--surface-soft)] px-3 py-2">COD depends on delivery zone</span>
              <span className="shrink-0 rounded-full bg-[color:var(--surface-soft)] px-3 py-2">bKash follows shop settings</span>
              <span className="shrink-0 rounded-full bg-[color:var(--surface-soft)] px-3 py-2">Support answers fast</span>
            </div>

            {/* Disables itself for the duration of the server action. Without
                this a double-tap on a slow mobile connection submits twice and
                creates two orders. */}
            <Button
              type="submit"
              size="lg"
              fullWidth
              pendingWhileSubmitting
              pendingLabel="Placing your order…"
              className="uppercase tracking-[0.18em]"
            >
              Place order and continue
            </Button>
          </form>
        </div>

        <aside className="rounded-[2rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
          <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Order total</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[color:var(--muted)]">Subtotal</dt>
              <dd className="font-medium text-[color:var(--foreground)]">{money(summary.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[color:var(--muted)]">Delivery fee</dt>
              <dd className="font-medium text-[color:var(--foreground)]">{deliveryFee === 0 ? "Free" : money(deliveryFee)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[color:var(--muted)]">Free over</dt>
              <dd className="font-medium text-[color:var(--foreground)]">{money(settings.freeDeliveryThreshold)}</dd>
            </div>
          </dl>

          <div className="mt-5 rounded-3xl bg-[color:var(--brand)] p-5 text-white">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/75">Estimated total</p>
            <p className="mt-3 text-2xl font-black sm:text-3xl">{money(summary.subtotal + deliveryFee)}</p>
          </div>

          <div className="mt-5 grid gap-3">
            <a
              href={`tel:${supportDigits}`}
              className="touch-target inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
            >
              <PhoneCall className="h-4 w-4" />
              Call support
            </a>
            <a
              href={`https://wa.me/${supportDigits}`}
              target="_blank"
              rel="noreferrer"
              className="touch-target inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--brand)]"
            >
              <MessageCircleMore className="h-4 w-4" />
              WhatsApp support
            </a>
          </div>

          <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
            Delivery charge is calculated by zone on the backend. Disabled payment methods are rejected even if a
            custom form submission attempts to use them.
          </p>
        </aside>
      </section>
    </PublicShell>
  );
}
