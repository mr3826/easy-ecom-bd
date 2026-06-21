import { PublicShell } from "@/components/public-shell";
import { StatusPill } from "@/components/status-pill";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/server/auth";
import { getOrCreateCart, getCartSummary, getSettings } from "@/server/store";
import { checkoutAction } from "@/app/actions";
import { money } from "@/lib/utils";

export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const guestKey = cookieStore.get("easy_ecom_guest")?.value ?? "guest-preview";
  const user = await getCurrentUser();
  const cart = getOrCreateCart(guestKey, user?.id);
  const summary = getCartSummary(cart);
  const settings = getSettings();

  return (
    <PublicShell>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Checkout</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">Complete your order</h1>
            </div>
            <StatusPill label={settings.bkashEnabled || settings.nagadEnabled ? "Payments enabled" : "Payments off"} tone="processing" />
          </div>

          <form action={checkoutAction} className="mt-8 grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">Name</span>
                <input name="customerName" required defaultValue={user?.name ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">Phone</span>
                <input name="customerPhone" required defaultValue={user?.phone ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
              </label>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Email</span>
              <input name="customerEmail" type="email" defaultValue={user?.email ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Shipping address</span>
              <textarea name="shippingAddress" rows={4} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Coupon code</span>
              <input name="couponCode" placeholder="Optional" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Notes</span>
              <textarea name="notes" rows={3} placeholder="Delivery instructions or product note" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <input type="radio" name="paymentProvider" value="bkash" defaultChecked disabled={!settings.bkashEnabled} />
                  <div>
                    <p className="font-semibold text-slate-950">bKash Merchant</p>
                    <p className="text-sm text-slate-600">Direct wallet checkout</p>
                  </div>
                </div>
              </label>
              <label className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <input type="radio" name="paymentProvider" value="nagad" disabled={!settings.nagadEnabled} />
                  <div>
                    <p className="font-semibold text-slate-950">Nagad Merchant</p>
                    <p className="text-sm text-slate-600">Direct wallet checkout</p>
                  </div>
                </div>
              </label>
            </div>

            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Place order and continue to payment
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
              <dt className="text-slate-500">Delivery</dt>
              <dd className="font-medium text-slate-950">{summary.subtotal >= settings.freeDeliveryThreshold ? "Free" : money(settings.deliveryCharge)}</dd>
            </div>
          </dl>
          <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Estimated total</p>
            <p className="mt-3 text-3xl font-semibold">
              {money(summary.subtotal + (summary.subtotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryCharge))}
            </p>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            The backend creates the order in pending state first, then initializes the selected wallet provider. Payment
            only flips to paid after verification.
          </p>
        </aside>
      </section>
    </PublicShell>
  );
}

