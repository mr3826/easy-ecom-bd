import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { getCurrentUser } from "@/server/auth";
import { listOrders } from "@/server/store";
import { StatusPill } from "@/components/status-pill";

export default async function AccountPage() {
  const user = await getCurrentUser();
  const orders = user ? listOrders().filter((order) => order.customerEmail === user.email || order.customerId === user.id) : [];

  return (
    <PublicShell>
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Account</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{user ? user.name : "Guest account"}</h1>
          <p className="mt-3 text-slate-600">{user ? user.email : "Sign in to view your orders and saved profile."}</p>
          {!user ? (
            <Link href="/login" className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              Sign in
            </Link>
          ) : null}
        </div>

        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{order.orderCode}</h2>
                  <p className="mt-1 text-sm text-slate-600">{order.shippingAddress}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill label={order.paymentStatus} tone={order.paymentStatus} />
                  <StatusPill label={order.deliveryStatus} tone={order.deliveryStatus} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}

