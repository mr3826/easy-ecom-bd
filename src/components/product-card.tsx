import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { money, cn } from "@/lib/utils";
import { addToCartAction } from "@/app/actions";
import { WishlistToggle } from "@/components/wishlist-toggle";

type ProductCardProps = {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    compareAtPrice?: number;
    badge?: string;
    soldOut?: boolean;
    collectionSlug?: string;
    tone?: string;
  };
  href?: string;
  actionLabel?: string;
  categoryName?: string;
};

export function ProductCard({ product, href = `/product/${product.slug}`, actionLabel, categoryName }: ProductCardProps) {
  const buttonLabel = actionLabel ?? (product.soldOut ? "Sold Out" : product.price <= 500 ? "Add to Cart" : "Select Options");
  const isSoldOut = product.soldOut || buttonLabel === "Sold Out";
  const canQuickAdd = !isSoldOut && buttonLabel === "Add to Cart";
  const collectionLabel = categoryName ?? product.collectionSlug?.replace(/-/g, " ") ?? "featured";
  const toneClass = product.tone ?? "from-[#e6ddd0] via-[#f2ece4] to-[#cbb9a4]";

  return (
    <article className="group flex h-full flex-col overflow-hidden border border-[color:var(--border)] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-0.5 hover:border-[color:var(--brand)] hover:shadow-[0_18px_38px_rgba(15,23,42,0.09)]">
      <Link href={href} className="block">
        <div className="relative aspect-[9/16] overflow-hidden bg-[color:var(--surface-soft)]">
          <div className={cn("absolute inset-0 bg-gradient-to-br", toneClass)} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.54),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(255,255,255,0.18),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.22))]" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/28 to-transparent" />

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {product.badge ? (
              <span className="rounded-full bg-black/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
                {product.badge}
              </span>
            ) : null}
            {product.compareAtPrice ? (
              <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--foreground)]">
                Sale
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
                tone: toneClass,
                badge: product.badge,
                compareAtPrice: product.compareAtPrice,
                collectionSlug: product.collectionSlug,
              }}
            />
          </div>

          {isSoldOut ? (
            <div className="absolute right-4 top-4 rounded-full border border-white/50 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground)]">
              Sold out
            </div>
          ) : null}

          <div className="absolute inset-0 flex items-end p-4">
            <div className="max-w-[72%] text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/78">
                {collectionLabel}
              </p>
              <h3 className="mt-2 text-lg font-black leading-tight sm:text-xl">{product.name}</h3>
            </div>
            <div className="ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/14 text-white backdrop-blur">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
              {collectionLabel}
            </p>
            <h3 className="mt-2 truncate text-[15px] font-semibold text-[color:var(--foreground)] sm:text-base">
              {product.name}
            </h3>
          </div>

          <div className="text-right">
            <p className="text-lg font-black text-[color:var(--foreground)] sm:text-xl">{money(product.price)}</p>
            {product.compareAtPrice ? (
              <p className="text-xs text-[color:var(--muted)] line-through">{money(product.compareAtPrice)}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-auto">
          {isSoldOut ? (
            <button
              type="button"
              disabled
              className="inline-flex w-full items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]"
            >
              Sold Out
            </button>
          ) : canQuickAdd ? (
            <form action={addToCartAction}>
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="quantity" value="1" />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_14px_28px_rgba(79,54,215,0.16)] transition hover:bg-[color:var(--brand)]"
              >
                {buttonLabel}
                <ShoppingBag className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <Link
              href={href}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_14px_28px_rgba(79,54,215,0.16)] transition hover:bg-[color:var(--brand)]"
            >
              {buttonLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
