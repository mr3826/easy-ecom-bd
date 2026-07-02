import Link from "next/link";
import { cookies } from "next/headers";
import { PublicShell } from "@/components/public-shell";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/server/auth";
import { getCartSummary, getOrCreateCart, getSettings } from "@/server/store";
import { money } from "@/lib/utils";
import { removeCartItemAction, updateCartQuantityAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cookieStore = await cookies();
  const guestKey = cookieStore.get("easy_ecom_guest")?.value ?? "guest-preview";
  const user = await getCurrentUser();
  const [cart, settings] = await Promise.all([getOrCreateCart(guestKey, user?.id), getSettings()]);
  const summary = await getCartSummary(cart);

  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">Cart</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)]">Your order summary</h1>
          </div>
          <StatusPill label={`${summary.itemCount} items`} tone="processing" />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {summary.items.length ? (
              summary.items.map((item) => (
                <div key={item.id} className="border border-[color:var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-[color:var(--foreground)]">{item.product.name}</h2>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">{money(item.product.price)} each</p>
                    </div>
                    <form action={removeCartItemAction}>
                      <input type="hidden" name="productId" value={item.productId} />
                      <button className="text-sm font-medium text-[#a11f2c] transition hover:text-[#7d1320]">Remove</button>
                    </form>
                  </div>
                  <form action={updateCartQuantityAction} className="mt-4 flex flex-wrap items-center gap-3">
                    <input type="hidden" name="productId" value={item.productId} />
                    <input
                      type="number"
                      name="quantity"
                      min={1}
                      defaultValue={item.quantity}
                      className="w-24 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-[color:var(--foreground)] outline-none"
                    />
                    <button className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white">
                      Update
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <div className="border border-dashed border-[color:var(--border)] bg-white p-10 text-center">
                <p className="text-lg font-semibold text-[color:var(--foreground)]">Your cart is empty.</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">The storefront should still feel useful here, so the empty state keeps the same visual weight as the product pages.</p>
                <Link href="/shop" className="mt-4 inline-flex rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
                  Shop products
                </Link>
              </div>
            )}
          </div>

          <aside className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Summary</h2>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-[color:var(--muted)]">Subtotal</dt>
                <dd className="font-medium text-[color:var(--foreground)]">{money(summary.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[color:var(--muted)]">Delivery</dt>
                <dd className="font-medium text-[color:var(--foreground)]">
                  {summary.subtotal >= settings.freeDeliveryThreshold ? "Free" : money(settings.deliveryCharge)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 rounded-2xl bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--muted)]">
              Free delivery unlocks at {money(settings.freeDeliveryThreshold)}.
            </p>
            <Link href="/checkout" className="mt-6 block rounded-full bg-[color:var(--accent)] px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Continue to checkout
            </Link>
          </aside>
        </div>
      </section>
    </PublicShell>
  );
}

