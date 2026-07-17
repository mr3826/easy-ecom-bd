import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { StorefrontCard } from "@/components/storefront-card";
import { searchStorefrontProducts } from "@/server/storefront-catalog";
import type { StorefrontProduct } from "@/lib/bornohin-storefront";

export const dynamic = "force-dynamic";

function sortProducts(
  products: StorefrontProduct[],
  sort: string,
) {
  const copy = [...products];
  if (sort === "price-low") return copy.sort((a, b) => a.price - b.price);
  if (sort === "price-high") return copy.sort((a, b) => b.price - a.price);
  if (sort === "new") return copy.sort((a, b) => Number(b.featured) - Number(a.featured));
  return copy.sort((a, b) => Number(b.featured) - Number(a.featured) || a.price - b.price);
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string; sort?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.query ?? "";
  const sort = params.sort ?? "";
  const products = sortProducts(await searchStorefrontProducts(query), sort);

  return (
    <PublicShell showCategoryRail>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden border border-[color:var(--border)] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">Catalog</p>
                <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)]">All products</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
                  {query ? `Searching for “${query}”. ` : ""}
                  This page now uses a simple free-text search and a single responsive product grid.
                </p>
              </div>
              <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
                {products.length} items
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              {query ? (
                <Link href="/shop" className="rounded-full bg-[color:var(--accent)] px-3 py-2 text-white">
                  Clear search
                </Link>
              ) : null}
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <StorefrontCard key={product.slug} product={product} />
              ))}
            </div>

            {!products.length ? (
              <div className="mt-8 rounded-[2rem] border border-dashed border-[color:var(--border)] bg-[color:var(--surface-soft)] p-8 text-center">
                <p className="text-lg font-semibold text-[color:var(--foreground)]">No products match this search.</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">Clear the query to continue browsing the catalog.</p>
                <Link href="/shop" className="mt-4 inline-flex rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
                  Reset search
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
