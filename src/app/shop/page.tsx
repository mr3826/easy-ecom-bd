import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { StorefrontCard } from "@/components/storefront-card";
import type { Metadata } from "next";
import {
  filterStorefrontProducts,
  getStorefrontBrandBySlug,
  getStorefrontBrandRail,
  getStorefrontCollectionBySlug,
} from "@/server/storefront-catalog";
import { getSiteOrigin } from "@/lib/site-url";
import type { StorefrontProduct } from "@/lib/bornohin-storefront";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; category?: string; query?: string; sort?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const query = params.query ?? "";
  const category = params.category ?? "";
  const brand = params.brand ?? "";

  let title = "Shop";
  let description = "Browse all products at Bornohin.";

  if (category) {
    const collection = await getStorefrontCollectionBySlug(category);
    if (collection) {
      title = collection.title;
      description = collection.summary;
    }
  }
  if (brand) {
    const brandData = await getStorefrontBrandBySlug(brand);
    if (brandData) {
      title = brandData.label;
      description = `Shop ${brandData.label} products at Bornohin.`;
    }
  }
  if (query) {
    title = `Search: ${query}`;
    description = `Search results for "${query}" at Bornohin.`;
  }

  const canonicalParams = [category && `category=${category}`, brand && `brand=${brand}`, query && `query=${query}`].filter(Boolean).join("&");
  const canonicalPath = canonicalParams ? `/shop?${canonicalParams}` : "/shop";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    alternates: {
      canonical: `${getSiteOrigin()}${canonicalPath}`,
    },
  };
}

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
  searchParams?: Promise<{ brand?: string; category?: string; query?: string; sort?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.query ?? "";
  const category = params.category ?? "";
  const brand = params.brand ?? "";
  const sort = params.sort ?? "";
  const [products, selectedCollection, selectedBrand, brandRail] = await Promise.all([
    filterStorefrontProducts(query, category, brand),
    category ? getStorefrontCollectionBySlug(category) : Promise.resolve(null),
    brand ? getStorefrontBrandBySlug(brand) : Promise.resolve(null),
    getStorefrontBrandRail(),
  ]);
  const sortedProducts = sortProducts(products, sort);

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
                  {selectedCollection ? `${selectedCollection.title}. ` : ""}
                  {selectedBrand ? `${selectedBrand.label}. ` : ""}
                  {query ? `Searching for “${query}”. ` : ""}
                  This page uses backend product, category, brand, and inventory data.
                </p>
              </div>
              <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
                {sortedProducts.length} items
              </div>
            </div>

            <div className="mt-5 grid gap-3 overflow-x-auto pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)] sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:text-sm">
              {brandRail.map((entry) => (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className="touch-target inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-4 py-2.5 text-[color:var(--foreground)] whitespace-nowrap transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand)] hover:text-white"
                >
                  {entry.label}
                </Link>
              ))}
              {query || category || brand ? (
                <Link href="/shop" className="touch-target inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-4 py-2.5 text-white whitespace-nowrap">
                  Clear filters
                </Link>
              ) : null}
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {sortedProducts.map((product) => (
                <StorefrontCard key={product.slug} product={product} />
              ))}
            </div>

            {!sortedProducts.length ? (
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
