import Link from "next/link";
import { cookies } from "next/headers";
import { PublicShell } from "@/components/public-shell";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/server/auth";
import { getCartSummary, getOrCreateCart, getSettings } from "@/server/store";
import { money } from "@/lib/utils";
import { removeCartItemAction, updateCartQuantityAction } from "@/app/actions";

export default async function CartPage() {
  const cookieStore = await cookies();
  const guestKey = cookieStore.get("easy_ecom_guest")?.value ?? "guest-preview";
  const user = await getCurrentUser();
  const cart = getOrCreateCart(guestKey, user?.id);
  const summary = getCartSummary(cart);
  const settings = getSettings();

  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Cart</p>
            <h1 className="mt-2 text-4xl font-semibold text-slate-950">Your order summary</h1>
          </div>
          <StatusPill label={`${summary.itemCount} items`} tone="processing" />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {summary.items.length ? summary.items.map((item) => (
              <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">{item.product.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{money(item.product.price)} each</p>
                  </div>
                  <form action={removeCartItemAction}>
                    <input type="hidden" name="productId" value={item.productId} />
                    <button className="text-sm font-medium text-rose-600 hover:text-rose-700">Remove</button>
                  </form>
                </div>
                <form action={updateCartQuantityAction} className="mt-4 flex items-center gap-3">
                  <input type="hidden" name="productId" value={item.productId} />
                  <input
                    type="number"
                    name="quantity"
                    min={1}
                    defaultValue={item.quantity}
                    className="w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-950"
                  />
                  <button className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200">
                    Update
                  </button>
                </form>
              </div>
            )) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-lg font-medium text-slate-950">Your cart is empty.</p>
                <Link href="/products" className="mt-3 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                  Shop products
                </Link>
              </div>
            )}
          </div>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Summary</h2>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="font-medium text-slate-950">{money(summary.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Delivery</dt>
                <dd className="font-medium text-slate-950">
                  {summary.subtotal >= settings.freeDeliveryThreshold ? "Free" : money(settings.deliveryCharge)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Free delivery unlocks at {money(settings.freeDeliveryThreshold)}.
            </p>
            <Link href="/checkout" className="mt-6 block rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white">
              Continue to checkout
            </Link>
          </aside>
        </div>
      </section>
    </PublicShell>
  );
}

