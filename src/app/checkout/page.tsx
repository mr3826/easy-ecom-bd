import { MessageCircleMore, PhoneCall } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { StatusPill } from "@/components/status-pill";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/server/auth";
import { getOrCreateCart, getCartSummary, getSettings } from "@/server/store";
import { CheckoutForm } from "@/components/checkout-form";
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

          <CheckoutForm
            userName={user?.name ?? ""}
            userPhone={user?.phone ?? ""}
            userEmail={user?.email ?? ""}
          />
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
