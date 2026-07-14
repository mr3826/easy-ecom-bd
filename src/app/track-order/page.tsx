import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { ContentPage } from "@/components/content-page";
import { storefrontPolicyPages } from "@/lib/bornohin-storefront";

export const dynamic = "force-dynamic";

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams?: Promise<{ code?: string; invoice?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const page = storefrontPolicyPages["track-order"];
  const trackingCode = params.code ?? params.invoice ?? "";

  return (
    <PublicShell>
      <ContentPage eyebrow={page.eyebrow} title={page.title} intro={page.intro} body={page.body} actions={[{ href: "/login", label: "Sign in" }, { href: "/contact-us", label: "Get help", variant: "outline" }]} />
      <section className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          {trackingCode ? (
            <div className="mb-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--brand)]">Tracking reference</p>
              <p className="mt-1 text-base font-semibold text-[color:var(--foreground)]">{trackingCode}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                Your order redirect has been preserved on this canonical route so the backend checkout flow can hand off here cleanly.
              </p>
            </div>
          ) : null}

          <label className="grid gap-2 text-sm font-medium text-[color:var(--foreground)]">
            Invoice number
            <input className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 outline-none" placeholder="Enter invoice number" />
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">Track order</button>
            <Link href="/shop" className="rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">
              Browse shop
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
