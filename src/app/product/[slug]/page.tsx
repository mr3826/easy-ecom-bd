import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { StorefrontCard } from "@/components/storefront-card";
import { WishlistToggle } from "@/components/wishlist-toggle";
import { money } from "@/lib/utils";
import { addToCartAction } from "@/app/actions";
import {
  getStorefrontCollectionBySlug,
  getStorefrontCollections,
  getStorefrontProductBySlug,
  getStorefrontRelatedProducts,
} from "@/server/storefront-catalog";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return [];
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug);
  if (!product) notFound();

  const [collection, related, siblingCollections] = await Promise.all([
    getStorefrontCollectionBySlug(product.collectionSlug),
    getStorefrontRelatedProducts(product.slug, product.collectionSlug),
    getStorefrontCollections().then((collections) => collections.filter((entry) => entry.slug !== product.collectionSlug).slice(0, 4)),
  ]);

  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
          <Link href="/" className="transition hover:text-[color:var(--brand)]">
            Home
          </Link>
          <span>/</span>
          <Link href="/shop" className="transition hover:text-[color:var(--brand)]">
            Shop
          </Link>
          <span>/</span>
          <Link href={`/shop?category=${product.collectionSlug}`} className="transition hover:text-[color:var(--brand)]">
            {collection?.title ?? product.collectionSlug}
          </Link>
          <span>/</span>
          <span className="text-[color:var(--foreground)]">{product.name}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden border border-[color:var(--border)] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <div className="relative aspect-[9/16] bg-white">
              <div className={`absolute inset-0 bg-gradient-to-br ${product.tone}`} />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.38),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.16))]" />
              <Image
                src={product.imageUrl ?? "/hero-products.png"}
                alt={product.imageAlt ?? product.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className={product.imageUrl ? "object-cover" : "object-cover mix-blend-soft-light opacity-70"}
              />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {product.badge ? <span className="rounded-full bg-[#111111] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">{product.badge}</span> : null}
                {product.featured ? <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#111111]">Hot</span> : null}
              </div>
            </div>
            <div className="grid gap-4 border-t border-[color:var(--border)] bg-[color:var(--surface-soft)] p-5 sm:grid-cols-3">
              {["Breathable feel", "Fast shipping ready", "Easy exchange"].map((value) => (
                <div key={value} className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-medium text-[color:var(--foreground)]">
                  {value}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[color:var(--border)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">{product.brandTitle ?? collection?.title ?? "Collection"}</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)]">{product.name}</h1>
            <p className="mt-4 text-base leading-8 text-[color:var(--muted)]">{product.description}</p>

            <div className="mt-6 flex items-end justify-between gap-4 border-y border-[color:var(--border)] py-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-[color:var(--muted)]">Price</p>
                <p className="mt-1 text-3xl font-black text-[color:var(--foreground)]">{money(product.price)}</p>
                {product.compareAtPrice ? <p className="mt-1 text-sm text-[color:var(--muted)] line-through">{money(product.compareAtPrice)}</p> : null}
              </div>
              <div className="text-right">
                <p className="text-sm uppercase tracking-[0.22em] text-[color:var(--muted)]">Availability</p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">{product.soldOut ? "Sold out" : "In stock"}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {product.soldOut ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center rounded-full bg-[color:var(--surface-soft)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]"
                >
                  Sold out
                </button>
              ) : (
                <form action={addToCartAction}>
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="quantity" value="1" />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white"
                  >
                    Add to cart
                  </button>
                </form>
              )}
              <WishlistToggle
                item={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  price: product.price,
                  tone: product.tone,
                  badge: product.badge,
                  compareAtPrice: product.compareAtPrice,
                  collectionSlug: product.collectionSlug,
                }}
              />
              <Link href={`/shop?category=${product.collectionSlug}`} className="inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">
                More in collection
              </Link>
              {product.brandSlug ? (
                <Link href={`/shop?brand=${product.brandSlug}`} className="inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">
                  More by brand
                </Link>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["COD ready", "Messenger support", "Nationwide delivery"].map((item) => (
                <div key={item} className="rounded-2xl bg-[color:var(--surface-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4">
              <details open className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
                <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">
                  Product details
                </summary>
                <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
                  Designed for the rebuilt storefront with a large hero image, bold title block, and easy-to-scan purchase info. This keeps the page visually close to the reference site while staying lightweight.
                </p>
              </details>
              <details className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
                <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">
                  Delivery & returns
                </summary>
                <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
                  Delivery and return messaging is centralized in this layout so it can be updated from one place without touching the page structure.
                </p>
              </details>
              <details className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
                <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">
                  Support
                </summary>
                <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
                  Call the store, message on Messenger, or continue browsing collections with the same navigation pattern used on the public site.
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--brand)]">Related products</p>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)]">More from this collection</h2>
            </div>
            <Link href={`/shop?category=${product.collectionSlug}`} className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)] transition hover:text-[color:var(--brand)]">
              View all
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((entry) => (
              <StorefrontCard key={entry.slug} product={entry} compact />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {siblingCollections.map((entry) => (
            <Link key={entry.slug} href={`/shop?category=${entry.slug}`} className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">{entry.subtitle}</p>
              <h2 className="mt-3 text-xl font-black uppercase text-[color:var(--foreground)]">{entry.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{entry.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}

