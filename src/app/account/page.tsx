import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/server/auth";
import { listOrders } from "@/server/store";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  const orders = user ? (await listOrders()).filter((order) => order.customerEmail === user.email || order.customerId === user.id) : [];

  return (
    <PublicShell>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">Account</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)]">{user ? user.name : "Guest account"}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">{user ? user.email : "Sign in to view your orders and saved profile."}</p>
          {!user ? (
            <Link href="/login" className="mt-6 inline-flex rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Sign in
            </Link>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/account/profile" className="rounded-full border border-[color:var(--border)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)] hover:border-[color:var(--brand)]">
                Edit profile
              </Link>
              <Link href="/account/addresses" className="rounded-full border border-[color:var(--border)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)] hover:border-[color:var(--brand)]">
                Addresses
              </Link>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border border-[color:var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[color:var(--foreground)]">{order.orderCode}</h2>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">{order.shippingAddress}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label={order.paymentStatus} tone={order.paymentStatus} />
                  <StatusPill label={order.deliveryStatus} tone={order.deliveryStatus} />
                </div>
              </div>
            </div>
          ))}

          {!orders.length ? (
            <div className="border border-dashed border-[color:var(--border)] bg-white p-8 text-center">
              <p className="text-lg font-semibold text-[color:var(--foreground)]">No orders yet.</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">Your order history will appear here after you sign in and place an order.</p>
            </div>
          ) : null}
        </div>
      </section>
    </PublicShell>
  );
}

