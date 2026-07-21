import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { ContentPage } from "@/components/content-page";
import { StatusPill } from "@/components/status-pill";
import { storefrontPolicyPages } from "@/lib/bornohin-storefront";
import { money, shortDate } from "@/lib/utils";
import { getOrderByCode } from "@/server/store";

export const dynamic = "force-dynamic";

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams?: Promise<{ code?: string; invoice?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const page = storefrontPolicyPages["track-order"];
  const trackingCode = params.code ?? params.invoice ?? "";
  const order = trackingCode ? await getOrderByCode(trackingCode.trim()) : null;

  return (
    <PublicShell>
      <ContentPage eyebrow={page.eyebrow} title={page.title} intro={page.intro} body={page.body} actions={[{ href: "/login", label: "Sign in" }, { href: "/contact-us", label: "Get help", variant: "outline" }]} />
      <section className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          {trackingCode ? (
            <div className="mb-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--brand)]">Tracking reference</p>
              <p className="mt-1 text-base font-semibold text-[color:var(--foreground)]">{trackingCode}</p>
              {order ? (
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-[color:var(--muted)]">Order</p>
                    <p className="mt-1 font-semibold text-[color:var(--foreground)]">{order.orderCode}</p>
                  </div>
                  <div>
                    <p className="text-[color:var(--muted)]">Total</p>
                    <p className="mt-1 font-semibold text-[color:var(--foreground)]">{money(order.total)}</p>
                  </div>
                  <div>
                    <p className="text-[color:var(--muted)]">Created</p>
                    <p className="mt-1 font-semibold text-[color:var(--foreground)]">{shortDate(order.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill label={order.status} tone={order.status} />
                    <StatusPill label={order.paymentStatus} tone={order.paymentStatus} />
                    <StatusPill label={order.deliveryStatus} tone={order.deliveryStatus} />
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  No matching order was found for this reference.
                </p>
              )}
            </div>
          ) : null}

          <form method="get" action="/track-order" className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-[color:var(--foreground)]">
              Invoice number
              <input name="code" defaultValue={trackingCode} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 outline-none" placeholder="Enter invoice number" />
            </label>
            <button className="w-fit rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">Track order</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/shop" className="rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">
              Browse shop
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
