import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShoppingBag, Star } from "lucide-react";
import type { StorefrontProduct } from "@/lib/bornohin-storefront";
import { money } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { addToCartAction } from "@/app/actions";
import { WishlistToggle } from "@/components/wishlist-toggle";

export function StorefrontCard({
  product,
  href = `/product/${product.slug}`,
  compact = false,
}: {
  product: StorefrontProduct;
  href?: string;
  compact?: boolean;
}) {
  const actionLabel = product.soldOut ? "Sold Out" : product.collectionSlug === "mini-fan" ? "Add to Cart" : product.price <= 500 ? "Add to Cart" : "Select Options";
  const canQuickAdd = !product.soldOut && actionLabel === "Add to Cart";

  return (
    <article className="group overflow-hidden border border-[color:var(--border)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-0.5 hover:border-[color:var(--brand)] hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <Link href={href} className="block">
        <div className={cn("relative overflow-hidden", compact ? "aspect-[9/16]" : "aspect-[9/16]")}>
          <div className={cn("absolute inset-0 bg-gradient-to-br", product.tone)} />
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.imageAlt ?? product.name} fill className="object-cover" sizes={compact ? "(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" : "(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"} />
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.34),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.2))]" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.28))]" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {product.badge ? (
              <span className="rounded-full bg-[#111111] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                {product.badge}
              </span>
            ) : null}
            {product.featured ? (
              <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#111111]">
                Hot
              </span>
            ) : null}
          </div>
          <div className="absolute right-4 top-4 z-[1]">
            <WishlistToggle
              compact
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
          </div>
          <div className="absolute inset-0 flex items-end justify-between p-4 text-white">
            <div className="max-w-[70%]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/80">{product.collectionTitle ?? product.collectionSlug.replace(/-/g, " ")}</p>
              <h3 className="mt-2 text-lg font-black leading-tight sm:text-xl">{product.name}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/12 text-white backdrop-blur">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
        </div>
      </Link>

      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">{product.collectionTitle ?? product.collectionSlug.replace(/-/g, " ")}</p>
          <div className="flex items-center gap-0.5 text-[#d89a47]" aria-label="Rated 5 stars">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="h-3.5 w-3.5 fill-current" />
            ))}
          </div>
        </div>

        {!compact ? (
          <p className="line-clamp-2 text-sm leading-6 text-[color:var(--muted)]">{product.description}</p>
        ) : null}

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-lg font-black text-[color:var(--foreground)]">{money(product.price)}</p>
            {product.compareAtPrice ? (
              <p className="text-sm text-[color:var(--muted)] line-through">{money(product.compareAtPrice)}</p>
            ) : null}
          </div>
          {product.soldOut ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              {actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          ) : canQuickAdd ? (
            <form action={addToCartAction}>
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="quantity" value="1" />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition group-hover:bg-[color:var(--brand)]"
              >
                {actionLabel}
                <ShoppingBag className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <Link
              href={href}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition group-hover:bg-[color:var(--brand)]"
            >
              {actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
