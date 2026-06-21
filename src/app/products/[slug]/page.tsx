import Image from "next/image";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { StatusPill } from "@/components/status-pill";
import { addToCartAction } from "@/app/actions";
import { getProductBySlug, listCategories, listProducts, getState } from "@/server/store";
import { money } from "@/lib/utils";

export async function generateStaticParams() {
  return listProducts().map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const categories = listCategories();
  const category = categories.find((entry) => entry.id === product.categoryId);
  const brand = getState().brands.find((entry) => entry.id === product.brandId);

  return (
    <PublicShell>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="relative aspect-[4/3] bg-slate-100">
            <Image src="/hero-products.png" alt={product.name} fill className="object-cover" priority />
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <StatusPill label={product.featured ? "Featured" : "Live"} tone={product.featured ? "active" : "processing"} />
            <span className="text-sm text-slate-500">{category?.name}</span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold text-slate-950">{product.name}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">{product.description}</p>
          <div className="mt-6 flex items-end gap-4">
            <p className="text-4xl font-semibold text-slate-950">{money(product.price)}</p>
            {product.compareAtPrice ? <p className="pb-1 text-lg text-slate-400 line-through">{money(product.compareAtPrice)}</p> : null}
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <dt className="text-slate-500">SKU</dt>
              <dd className="mt-1 font-medium text-slate-950">{product.sku}</dd>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <dt className="text-slate-500">Stock</dt>
              <dd className="mt-1 font-medium text-slate-950">{product.stock}</dd>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <dt className="text-slate-500">Brand</dt>
              <dd className="mt-1 font-medium text-slate-950">{brand?.name}</dd>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <dt className="text-slate-500">Tags</dt>
              <dd className="mt-1 font-medium text-slate-950">{product.tags.join(", ")}</dd>
            </div>
          </dl>
          <form action={addToCartAction} className="mt-8 flex flex-wrap items-center gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <label className="grid w-24 gap-2 text-sm">
              <span className="text-slate-600">Qty</span>
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-950 outline-none ring-0 focus:border-slate-400"
              />
            </label>
            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Add to cart
            </button>
          </form>
        </div>
      </section>
    </PublicShell>
  );
}

