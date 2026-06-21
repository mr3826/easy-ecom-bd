import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/domain";
import { money } from "@/lib/utils";
import { StatusPill } from "@/components/status-pill";

export function ProductCard({
  product,
  imageUrl,
  categoryName,
}: {
  product: Product;
  imageUrl?: string;
  categoryName: string;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] bg-slate-100">
        <Image
          src={imageUrl ?? "/hero-products.png"}
          alt={product.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{categoryName}</p>
          <StatusPill label={product.featured ? "Featured" : product.isActive ? "Live" : "Hidden"} tone={product.featured ? "active" : product.isActive ? "processing" : "inactive"} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{product.name}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{product.description}</p>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xl font-semibold text-slate-950">{money(product.price)}</p>
            {product.compareAtPrice ? (
              <p className="text-sm text-slate-500 line-through">{money(product.compareAtPrice)}</p>
            ) : null}
          </div>
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}

