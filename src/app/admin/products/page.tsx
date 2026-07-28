import Link from "next/link";
import { PencilLine, Plus, Trash2 } from "lucide-react";
import { bulkUploadProductsAction, deleteProductAction } from "@/app/admin/actions";
import { ProductBulkUploadButton } from "@/components/admin/product-bulk-upload";
import { ProductsFilterDrawer } from "@/components/admin/products-filter-drawer";
import { StatusPill } from "@/components/status-pill";
import { money } from "@/lib/utils";
import { listCategories, listProducts } from "@/server/store";

function formatProductSource(source?: string | null) {
  return source === "bulk" ? "Bulk upload" : "Manual";
}

function parseOptionalFilterNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function variantBadges(groups: Array<{ name: string; options: string[] }>) {
  return groups
    .map((group) => group.name.trim() || group.options[0] || "")
    .filter(Boolean)
    .slice(0, 3);
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    source?: string;
    minPrice?: string;
    maxPrice?: string;
    imported?: string;
  }>;
}) {
  const { q = "", status = "all", category = "all", source = "all", minPrice = "", maxPrice = "", imported = "" } =
    await searchParams;
  const [allProducts, categories] = await Promise.all([listProducts(), listCategories()]);

  const query = q.trim().toLowerCase();
  const minPriceValue = parseOptionalFilterNumber(minPrice);
  const maxPriceValue = parseOptionalFilterNumber(maxPrice);
  const products = allProducts.filter((product) => {
    const productSource = product.metadata?.source ?? "manual";
    const matchesQuery =
      !query ||
      [product.name, product.sku, product.description, ...product.tags, ...(product.searchKeywords ?? []), productSource]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesStatus =
      status === "all" || (status === "active" && product.isActive) || (status === "inactive" && !product.isActive);
    const matchesCategory = category === "all" || product.categoryId === category;
    const matchesSource = source === "all" || productSource === source;
    const matchesMinPrice = minPriceValue === null || product.price >= minPriceValue;
    const matchesMaxPrice = maxPriceValue === null || product.price <= maxPriceValue;
    return matchesQuery && matchesStatus && matchesCategory && matchesSource && matchesMinPrice && matchesMaxPrice;
  });

  const importedCount = Number(imported) || 0;

  return (
    <div className="space-y-8 text-[color:var(--foreground)]">
      <section className="rounded-[2rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_24px_80px_rgba(61,39,35,0.06)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--brand)]">Products</p>
            <h1 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)] sm:text-3xl">Products & Inventory</h1>
            <p className="mt-2 text-xs leading-6 text-[color:var(--muted)] sm:text-sm">
              Add products so customer replies include the right price, stock, size, and delivery details.
            </p>
            {importedCount > 0 ? (
              <div className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 sm:px-4 sm:py-2">
                Imported {importedCount} product{importedCount === 1 ? "" : "s"} from bulk upload.
              </div>
            ) : null}
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start">
            <form action={bulkUploadProductsAction} className="grid justify-items-end gap-2">
              <ProductBulkUploadButton templateHref="/admin/products/upload-template" />
            </form>
            <Link
              href="/admin/products/new"
              className="touch-target inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent)]"
            >
              <Plus className="h-4 w-4" />
              Add A Product
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <form method="get" action="/admin/products" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="source" value={source} />
          <input type="hidden" name="minPrice" value={minPrice} />
          <input type="hidden" name="maxPrice" value={maxPrice} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by product name, SKU"
            className="w-full rounded-full border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]/60"
          />
          <button className="touch-target inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent)]">
            Search
          </button>
        </form>
        <div className="flex items-center gap-3">
          <ProductsFilterDrawer categories={categories} values={{ q, category, status, source, minPrice, maxPrice }} />
          <Link href="/admin/products/new" className="touch-target inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent)]">
            <Plus className="h-4 w-4" />
            Add A Product
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:hidden">
        {products.length ? (
          products.map((product) => {
            const categoryItem = categories.find((item) => item.id === product.categoryId);
            const variantLabels = variantBadges(product.metadata?.variantGroups ?? []);
            const sourceLabel = formatProductSource(product.metadata?.source ?? "manual");
            return (
              <article key={product.id} className="rounded-[1.5rem] border border-[color:var(--border)] bg-white p-4 shadow-[0_16px_40px_rgba(61,39,35,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-[color:var(--foreground)]">{product.name}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-[color:var(--foreground)]">{money(product.price)}</p>
                    {product.stock <= product.lowStockThreshold ? <StatusPill label="Low stock" tone="processing" /> : null}
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 text-sm text-[color:var(--muted)]">
                  <div className="flex items-center justify-between gap-3">
                    <dt>Category</dt>
                    <dd className="text-right text-[color:var(--foreground)]">{categoryItem?.name ?? "Uncategorized"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Status</dt>
                    <dd><StatusPill label={product.isActive ? "Active" : "Hidden"} tone={product.isActive ? "active" : "inactive"} /></dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Source</dt>
                    <dd className="text-right text-[color:var(--foreground)]">{sourceLabel}</dd>
                  </div>
                </dl>

                {variantLabels.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {variantLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-[color:var(--brand)]/20 bg-[color:var(--brand-soft)] px-3 py-1 text-xs text-[color:var(--brand)]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/products/new?edit=${product.id}`}
                    className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] text-[color:var(--muted)] transition hover:border-[color:var(--brand)]/40 hover:text-[color:var(--brand)]"
                    aria-label={`Edit ${product.name}`}
                  >
                    <PencilLine className="h-4 w-4" />
                  </Link>
                  <form action={deleteProductAction}>
                    <input type="hidden" name="id" value={product.id} />
                    <button
                      className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] text-[color:var(--muted)] transition hover:border-rose-400/40 hover:text-rose-500"
                      aria-label={`Delete ${product.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white p-8 text-center text-sm text-[color:var(--muted)]">
            No products match the current filters.
          </div>
        )}
      </section>

      <section className="hidden overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-white shadow-[0_24px_80px_rgba(61,39,35,0.06)] lg:block">
        <div className="flex flex-col gap-2 border-b border-[color:var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--foreground)] sm:text-xl">Catalog</h2>
            <p className="mt-1 text-xs text-[color:var(--muted)] sm:text-sm">{products.length} product{products.length === 1 ? "" : "s"} visible</p>
          </div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Variants, stock, and source are surfaced in one view.
          </p>
        </div>
        <div className="overflow-x-auto overscroll-contain px-4 py-2 sm:px-6">
          <table className="w-full min-w-[820px] divide-y divide-[color:var(--border)] text-sm">
            <thead className="bg-[color:var(--surface-soft)] text-[color:var(--muted)]">
              <tr>
                <th className="px-6 py-4 text-left font-medium uppercase tracking-[0.18em]">Product</th>
                <th className="px-6 py-4 text-left font-medium uppercase tracking-[0.18em]">SKU</th>
                <th className="px-6 py-4 text-left font-medium uppercase tracking-[0.18em]">Price</th>
                <th className="px-6 py-4 text-left font-medium uppercase tracking-[0.18em]">Quantity</th>
                <th className="px-6 py-4 text-left font-medium uppercase tracking-[0.18em]">Category</th>
                <th className="px-6 py-4 text-left font-medium uppercase tracking-[0.18em]">Variants</th>
                <th className="px-6 py-4 text-left font-medium uppercase tracking-[0.18em]">Status</th>
                <th className="px-6 py-4 text-left font-medium uppercase tracking-[0.18em]">Source</th>
                <th className="px-6 py-4 text-right font-medium uppercase tracking-[0.18em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {products.length ? (
                products.map((product) => {
                  const categoryItem = categories.find((item) => item.id === product.categoryId);
                  const variantLabels = variantBadges(product.metadata?.variantGroups ?? []);
                  const sourceLabel = formatProductSource(product.metadata?.source ?? "manual");
                  return (
                    <tr key={product.id} className="bg-white">
                      <td className="px-6 py-5 align-top">
                        <div className="max-w-[280px]">
                          <p className="text-base font-semibold text-[color:var(--foreground)]">{product.name}</p>
                          <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                            {product.isActive ? "Visible in catalog" : "Hidden from catalog"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-top font-mono text-sm text-[color:var(--muted)]">{product.sku}</td>
                      <td className="px-6 py-5 align-top text-[color:var(--foreground)]">{money(product.price)}</td>
                      <td className="px-6 py-5 align-top">
                        <div className="flex items-center gap-3">
                          <span className="text-[color:var(--foreground)]">{product.stock}</span>
                          {product.stock <= product.lowStockThreshold ? (
                            <StatusPill label="Low stock" tone="processing" />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-5 align-top text-[color:var(--muted)]">{categoryItem?.name ?? "Uncategorized"}</td>
                      <td className="px-6 py-5 align-top">
                        {variantLabels.length ? (
                          <div className="flex flex-wrap gap-2">
                            {variantLabels.map((label) => (
                              <span
                                key={label}
                                className="rounded-full border border-[color:var(--brand)]/20 bg-[color:var(--brand-soft)] px-3 py-1 text-xs text-[color:var(--brand)]"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[color:var(--muted)]">None</span>
                        )}
                      </td>
                      <td className="px-6 py-5 align-top">
                        <StatusPill label={product.isActive ? "Active" : "Hidden"} tone={product.isActive ? "active" : "inactive"} />
                      </td>
                      <td className="px-6 py-5 align-top text-[color:var(--muted)]">{sourceLabel}</td>
                      <td className="px-6 py-5 align-top">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/products/new?edit=${product.id}`}
                            className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] text-[color:var(--muted)] transition hover:border-[color:var(--brand)]/40 hover:text-[color:var(--brand)]"
                            aria-label={`Edit ${product.name}`}
                          >
                            <PencilLine className="h-5 w-5" />
                          </Link>
                          <form action={deleteProductAction}>
                            <input type="hidden" name="id" value={product.id} />
                            <button
                              className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] text-[color:var(--muted)] transition hover:border-rose-400/40 hover:text-rose-500"
                              aria-label={`Delete ${product.name}`}
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center text-sm text-[color:var(--muted)]">
                    No products match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
