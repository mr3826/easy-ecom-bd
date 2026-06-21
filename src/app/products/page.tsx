import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { ProductCard } from "@/components/product-card";
import { listCategories, listProducts } from "@/server/store";

export default function ProductsPage() {
  const products = listProducts();
  const categories = listCategories();

  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Catalog</p>
            <h1 className="mt-2 text-4xl font-semibold text-slate-950">Products</h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Browse the catalog that feeds the storefront, checkout, and landing page builder.
            </p>
          </div>
          <Link
            href="/checkout"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go to checkout
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">All</span>
          {categories.map((category) => (
            <span key={category.id} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
              {category.name}
            </span>
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const category = categories.find((entry) => entry.id === product.categoryId);
            return <ProductCard key={product.id} product={product} categoryName={category?.name ?? "Category"} />;
          })}
        </div>
      </section>
    </PublicShell>
  );
}

