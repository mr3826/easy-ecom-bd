import Link from "next/link";
import type { StorefrontCollection } from "@/lib/mokkah-storefront";
import { ProductCard } from "@/components/product-card";

type ProductSectionProps = {
  collection: StorefrontCollection;
  limit?: number;
};

export function ProductSection({ collection, limit = 4 }: ProductSectionProps) {
  const products = collection.products.slice(0, limit);
  const href = `/shop?category=${collection.slug}`;
  const actionLabel =
    collection.slug === "cotton-unstitched" || collection.slug === "premium-silk-saree" || collection.slug === "1piece-dresses"
      ? "Add to Cart"
      : "Select Options";

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${collection.accent}`} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand)]">
              {collection.subtitle}
            </p>
          </div>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)] sm:text-[2rem]">
            {collection.title}
          </h2>
        </div>

        <Link
          href={href}
          className="whitespace-nowrap text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--brand)] transition hover:text-[color:var(--accent)]"
        >
          See More
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} actionLabel={actionLabel} />
        ))}
      </div>

    </section>
  );
}
