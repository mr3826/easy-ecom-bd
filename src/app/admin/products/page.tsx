import Link from "next/link";
import { saveProductAction, deleteProductAction } from "@/app/admin/actions";
import { listBrands, listCategories, listProducts } from "@/server/store";
import { money } from "@/lib/utils";
import { StatusPill } from "@/components/status-pill";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const products = listProducts();
  const categories = listCategories();
  const brands = listBrands();
  const selected = products.find((item) => item.id === edit);

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Products</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{selected ? "Edit product" : "Product CRUD"}</h1>
      </div>

      <form action={saveProductAction} className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <input type="hidden" name="id" value={selected?.id ?? ""} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2 text-sm">
            <span>Name</span>
            <input name="name" defaultValue={selected?.name ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Slug</span>
            <input name="slug" defaultValue={selected?.slug ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>SKU</span>
            <input name="sku" defaultValue={selected?.sku ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm md:col-span-2 xl:col-span-3">
            <span>Description</span>
            <textarea name="description" rows={3} defaultValue={selected?.description ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Price</span>
            <input name="price" type="number" defaultValue={selected?.price ?? 0} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Compare at price</span>
            <input name="compareAtPrice" type="number" defaultValue={selected?.compareAtPrice ?? 0} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Stock</span>
            <input name="stock" type="number" defaultValue={selected?.stock ?? 0} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Weight grams</span>
            <input name="weightGrams" type="number" defaultValue={selected?.weightGrams ?? 0} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Category</span>
            <select name="categoryId" defaultValue={selected?.categoryId ?? categories[0]?.id} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span>Brand</span>
            <select name="brandId" defaultValue={selected?.brandId ?? brands[0]?.id} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span>Tags comma separated</span>
            <input name="tags" defaultValue={selected?.tags.join(", ") ?? ""} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Featured</span>
            <select name="featured" defaultValue={selected?.featured ? "true" : "false"} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span>Status</span>
            <select name="isActive" defaultValue={selected?.isActive ? "true" : "false"} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
              <option value="true">Active</option>
              <option value="false">Hidden</option>
            </select>
          </label>
        </div>
        <button className="w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">{selected ? "Update product" : "Create product"}</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {products.map((product) => {
          const category = categories.find((item) => item.id === product.categoryId);
          return (
            <div key={product.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{product.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{category?.name} · {money(product.price)} · stock {product.stock}</p>
                </div>
                <StatusPill label={product.isActive ? "active" : "hidden"} tone={product.isActive ? "active" : "inactive"} />
              </div>
              <div className="mt-4 flex gap-3">
                <Link href={`/admin/products?edit=${product.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">Edit</Link>
                <form action={deleteProductAction}>
                  <input type="hidden" name="id" value={product.id} />
                  <button className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200">Delete</button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

