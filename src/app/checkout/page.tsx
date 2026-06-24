import { MessageCircleMore, PhoneCall } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { StatusPill } from "@/components/status-pill";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/server/auth";
import { getOrCreateCart, getCartSummary, getSettings } from "@/server/store";
import { checkoutAction } from "@/app/actions";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const guestKey = cookieStore.get("easy_ecom_guest")?.value ?? "guest-preview";
  const user = await getCurrentUser();
  const [cart, settings] = await Promise.all([
    getOrCreateCart(guestKey, user?.id),
    getSettings(),
  ]);
  const summary = await getCartSummary(cart);
  const deliveryFee = summary.subtotal >= settings.freeDeliveryThreshold ? 0 : settings.insideDhakaDeliveryCharge;
  const supportDigits = settings.contactNumber.replace(/\D/g, "");
  const paymentMethods = [
    { key: "cod", name: "Cash on Delivery", description: "Pay when the parcel arrives", enabled: settings.codEnabled },
    { key: "bkash", name: "bKash", description: settings.bkashInstructions || "Mobile wallet checkout after order creation", enabled: settings.bkashEnabled },
    { key: "nagad", name: "Nagad", description: settings.nagadInstructions || "Manual mobile payment instructions", enabled: settings.nagadEnabled },
    { key: "rocket", name: "Rocket", description: settings.rocketInstructions || "Manual mobile payment instructions", enabled: settings.rocketEnabled },
  ];

  return (
    <PublicShell>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Checkout</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">Complete your order</h1>
            </div>
            <StatusPill
              label={paymentMethods.some((method) => method.enabled) ? "Payments available" : "Payments off"}
              tone={paymentMethods.some((method) => method.enabled) ? "active" : "inactive"}
            />
          </div>

          <form action={checkoutAction} className="mt-8 grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">Name</span>
                <input
                  name="customerName"
                  required
                  defaultValue={user?.name ?? ""}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">Phone</span>
                <input
                  name="customerPhone"
                  required
                  defaultValue={user?.phone ?? ""}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">District</span>
                <input
                  name="district"
                  required
                  placeholder="Dhaka"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">Email</span>
                <input
                  name="customerEmail"
                  type="email"
                  defaultValue={user?.email ?? ""}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Shipping address</span>
              <textarea
                name="shippingAddress"
                rows={4}
                required
                placeholder="House, road, area, landmark"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Coupon code</span>
              <input
                name="couponCode"
                placeholder="Optional"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Notes</span>
              <textarea
                name="notes"
                rows={3}
                placeholder="Delivery instructions or product note"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              {paymentMethods.map((method, index) => (
                <label key={method.key} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.key}
                      defaultChecked={index === 0}
                      disabled={!method.enabled}
                    />
                    <div>
                      <p className="font-semibold text-slate-950">{method.name}</p>
                      <p className="text-sm text-slate-600">{method.enabled ? method.description : "Disabled by shop"}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
              <span className="rounded-full bg-slate-50 px-3 py-2">COD depends on delivery zone</span>
              <span className="rounded-full bg-slate-50 px-3 py-2">MFS methods follow shop settings</span>
              <span className="rounded-full bg-slate-50 px-3 py-2">Support answers fast</span>
            </div>

            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Place order and continue
            </button>
          </form>
        </div>

        <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Order total</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-medium text-slate-950">{money(summary.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Delivery fee</dt>
              <dd className="font-medium text-slate-950">{deliveryFee === 0 ? "Free" : money(deliveryFee)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Free over</dt>
              <dd className="font-medium text-slate-950">{money(settings.freeDeliveryThreshold)}</dd>
            </div>
          </dl>

          <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Estimated total</p>
            <p className="mt-3 text-3xl font-semibold">{money(summary.subtotal + deliveryFee)}</p>
          </div>

          <div className="mt-5 grid gap-3">
            <a
              href={`tel:${supportDigits}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              <PhoneCall className="h-4 w-4" />
              Call support
            </a>
            <a
              href={`https://wa.me/${supportDigits}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              <MessageCircleMore className="h-4 w-4" />
              WhatsApp support
            </a>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            Delivery charge is calculated by zone on the backend. Disabled payment methods are rejected even if a
            custom form submission attempts to use them.
          </p>
        </aside>
      </section>
    </PublicShell>
  );
}
