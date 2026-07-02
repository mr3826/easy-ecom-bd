import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { StorefrontCard } from "@/components/storefront-card";
import { searchStorefrontProducts } from "@/lib/mokkah-storefront";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.query ?? "";
  const matching = searchStorefrontProducts(query);

  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden border border-[color:var(--border)] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="bg-[color:var(--surface-soft)] px-6 py-4 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">Search results</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)]">
              {query ? `Results for “${query}”` : "Search the store"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
              This page mirrors the public store search overlay and uses the same product data as the shop pages.
            </p>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              <Link href="/search" className="rounded-full bg-[color:var(--accent)] px-3 py-2 text-white">
                Clear all
              </Link>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {matching.map((product) => (
                <StorefrontCard key={product.slug} product={product} compact />
              ))}
            </div>

            {!matching.length ? (
              <div className="mt-8 rounded-[2rem] border border-dashed border-[color:var(--border)] bg-[color:var(--surface-soft)] p-8 text-center">
                <p className="text-lg font-semibold text-[color:var(--foreground)]">No search results found.</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">Try a different query or browse the collection pages instead.</p>
                <Link href="/shop" className="mt-4 inline-flex rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
                  Browse shop
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
