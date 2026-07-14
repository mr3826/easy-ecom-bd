import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpDown, PencilLine, Trash2 } from "lucide-react";
import { adjustInventoryAction, bulkUploadProductsAction, deleteProductAction, saveProductAction } from "@/app/admin/actions";
import { ProductBulkUploadButton } from "@/components/admin/product-bulk-upload";
import { ProductsFilterDrawer } from "@/components/admin/products-filter-drawer";
import { ProductImageUploader } from "@/components/admin/product-image-uploader";
import { ProductVariantEditor } from "@/components/admin/product-variant-editor";
import { StatusPill } from "@/components/status-pill";
import { normalizeProductMetadata, productConditionOptions, productDimensionUnitOptions, productWeightUnitOptions } from "@/lib/product-admin";
import { money } from "@/lib/utils";
import { listBrands, listCategories, listInventoryLogs, listProductImages, listProducts } from "@/server/store";

const fieldClass =
  "w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60";
const textareaClass = `${fieldClass} min-h-[7rem] resize-y`;
const selectClass = `${fieldClass} appearance-none`;
const cardClass = "rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.22)]";

function SectionCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${cardClass} ${className}`.trim()}>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm text-slate-200 ${className}`.trim()}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-slate-100">{label}</span>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function ToggleField({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-sky-400 focus:ring-sky-400/40"
      />
      <span className="grid gap-1">
        <span className="text-sm font-medium text-white">{label}</span>
        {hint ? <span className="text-xs leading-5 text-slate-400">{hint}</span> : null}
      </span>
    </label>
  );
}

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
    edit?: string;
    q?: string;
    status?: string;
    category?: string;
    source?: string;
    minPrice?: string;
    maxPrice?: string;
    imported?: string;
  }>;
}) {
  const { edit = "", q = "", status = "all", category = "all", source = "all", minPrice = "", maxPrice = "", imported = "" } =
    await searchParams;
  const [allProducts, categories, brands, productImages, inventoryLogs] = await Promise.all([
    listProducts(),
    listCategories(),
    listBrands(),
    listProductImages(),
    listInventoryLogs(),
  ]);

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

  const selected = allProducts.find((item) => item.id === edit) ?? null;
  const selectedImages = selected ? productImages.filter((image) => image.productId === selected.id) : [];
  const selectedMetadata = normalizeProductMetadata(selected?.metadata ?? null);
  const categoryId = selected?.categoryId ?? categories[0]?.id ?? "";
  const brandId = selected?.brandId ?? brands[0]?.id ?? "";
  const importedCount = Number(imported) || 0;
  const inventoryProductById = new Map(allProducts.map((product) => [product.id, product]));

  return (
    <div className="space-y-8 text-slate-100">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.22)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-200/80">Products</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Products & Inventory</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Add products so customer replies include the right price, stock, size, and delivery details.
            </p>
            {importedCount > 0 ? (
              <div className="mt-4 inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
                Imported {importedCount} product{importedCount === 1 ? "" : "s"} from bulk upload.
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <form action={bulkUploadProductsAction} encType="multipart/form-data" className="grid justify-items-end gap-2">
              <ProductBulkUploadButton templateHref="/admin/products/upload-template" />
            </form>
            <Link
              href="/admin/products#product-editor"
              className="inline-flex items-center justify-center rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              + Add A Product
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
        <form method="get" action="/admin/products" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="source" value={source} />
          <input type="hidden" name="minPrice" value={minPrice} />
          <input type="hidden" name="maxPrice" value={maxPrice} />
          <input type="hidden" name="edit" value={edit} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by product name, SKU"
            className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
          />
          <button className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
            Search
          </button>
        </form>
        <ProductsFilterDrawer
          categories={categories}
          values={{ q, edit, category, status, source, minPrice, maxPrice }}
        />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_24px_80px_rgba(2,6,23,0.22)]">
        <div className="flex flex-col gap-2 border-b border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Catalog</h2>
            <p className="mt-1 text-sm text-slate-400">{products.length} product{products.length === 1 ? "" : "s"} visible</p>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
            Variants, stock, and source are surfaced in one view.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full divide-y divide-white/10 text-sm">
            <thead className="bg-slate-950/60 text-slate-400">
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
            <tbody className="divide-y divide-white/10">
              {products.length ? (
                products.map((product) => {
                  const categoryItem = categories.find((item) => item.id === product.categoryId);
                  const variantLabels = variantBadges(product.metadata?.variantGroups ?? []);
                  const sourceLabel = formatProductSource(product.metadata?.source ?? "manual");
                  return (
                    <tr key={product.id} className="bg-slate-950/35">
                      <td className="px-6 py-5 align-top">
                        <div className="max-w-[280px]">
                          <p className="text-base font-semibold text-white">{product.name}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {product.isActive ? "Visible in catalog" : "Hidden from catalog"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-top font-mono text-sm text-slate-300">{product.sku}</td>
                      <td className="px-6 py-5 align-top text-slate-200">{money(product.price)}</td>
                      <td className="px-6 py-5 align-top">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-200">{product.stock}</span>
                          {product.stock <= product.lowStockThreshold ? (
                            <StatusPill label="Low stock" tone="processing" />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-5 align-top text-slate-300">{categoryItem?.name ?? "Uncategorized"}</td>
                      <td className="px-6 py-5 align-top">
                        {variantLabels.length ? (
                          <div className="flex flex-wrap gap-2">
                            {variantLabels.map((label) => (
                              <span key={label} className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs text-sky-200">
                                {label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>
                      <td className="px-6 py-5 align-top">
                        <StatusPill label={product.isActive ? "Active" : "Hidden"} tone={product.isActive ? "active" : "inactive"} />
                      </td>
                      <td className="px-6 py-5 align-top text-slate-300">{sourceLabel}</td>
                      <td className="px-6 py-5 align-top">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/products?edit=${product.id}#product-editor`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-sky-400/40 hover:text-sky-200"
                            aria-label={`Edit ${product.name}`}
                          >
                            <PencilLine className="h-4 w-4" />
                          </Link>
                          <form action={deleteProductAction}>
                            <input type="hidden" name="id" value={product.id} />
                            <button
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-rose-400/40 hover:text-rose-200"
                              aria-label={`Delete ${product.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center text-sm text-slate-400">
                    No products match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <SectionCard
          title="Inventory & Stock"
          description="Quickly adjust inventory while keeping the stock ledger inside the products module."
        >
          <form
            action={adjustInventoryAction}
            className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_minmax(0,1.2fr)_auto]"
          >
            <FieldLabel label="Product" hint="Required" className="lg:col-span-1">
              <select name="productId" className={selectClass} defaultValue={allProducts[0]?.id ?? ""}>
                {allProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Change" hint="Positive or negative">
              <input name="change" type="number" defaultValue={1} className={fieldClass} />
            </FieldLabel>
            <FieldLabel label="Reason" hint="Required" className="lg:col-span-1">
              <input name="reason" defaultValue="Manual stock adjustment" className={fieldClass} />
            </FieldLabel>
            <button className="mt-6 inline-flex h-fit items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
              Apply change
            </button>
          </form>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <ArrowUpDown className="h-3.5 w-3.5" />
            Stock changes create inventory log entries and update the product quantity immediately.
          </div>
        </SectionCard>

        <SectionCard
          title="Recent inventory logs"
          description="Most recent stock movements from manual updates and order flows."
        >
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Product</th>
                  <th className="px-4 py-3 text-left font-medium">Change</th>
                  <th className="px-4 py-3 text-left font-medium">Reason</th>
                  <th className="px-4 py-3 text-left font-medium">New stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {inventoryLogs.slice(0, 8).map((log) => {
                  const product = inventoryProductById.get(log.productId);
                  return (
                    <tr key={log.id}>
                      <td className="px-4 py-3 text-white">{product?.name ?? "Unknown product"}</td>
                      <td className={`px-4 py-3 font-semibold ${log.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {log.change > 0 ? "+" : ""}
                        {log.change}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{log.reason}</td>
                      <td className="px-4 py-3 text-slate-300">{log.newStock}</td>
                    </tr>
                  );
                })}
                {inventoryLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                      No inventory logs yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </section>

      <form id="product-editor" action={saveProductAction} encType="multipart/form-data" className="space-y-6 scroll-mt-24">
        <input type="hidden" name="id" value={selected?.id ?? ""} />

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.22)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-200/80">Product editor</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{selected ? "Edit product" : "Add A Product"}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Keep Bornohin branding intact while editing structured product, shipping, and inventory fields.
              </p>
            </div>
            {selected ? (
              <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                Editing <span className="font-semibold text-white">{selected.name}</span>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">New product mode</div>
            )}
          </div>
        </section>

        {selected ? (
          <div className="rounded-[2rem] border border-sky-400/20 bg-sky-500/10 p-5 text-sky-50 shadow-[0_20px_60px_rgba(14,165,233,0.12)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/70">Editing mode</p>
                <p className="mt-2 text-sm leading-6 text-sky-50/90">
                  Changes will overwrite the selected product record and keep the public storefront stable for now.
                </p>
              </div>
              <Link
                href="/admin/products#product-editor"
                className="inline-flex w-fit items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/15"
              >
                Create new product
              </Link>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
          <div className="grid gap-6">
            <SectionCard
              title="Product Information"
              description="Core product details, pricing, and upload-backed image management."
            >
              <div className="grid gap-4">
                <FieldLabel label="Product name" hint="Required">
                  <input
                    name="name"
                    defaultValue={selected?.name ?? ""}
                    placeholder="Enter product name"
                    className={fieldClass}
                  />
                </FieldLabel>

                <FieldLabel label="Slug" hint="Optional">
                  <input
                    name="slug"
                    defaultValue={selected?.slug ?? ""}
                    placeholder="auto-generated from name"
                    className={fieldClass}
                  />
                </FieldLabel>

                <FieldLabel label="Description" hint="Required">
                  <textarea
                    name="description"
                    rows={5}
                    defaultValue={selected?.description ?? ""}
                    placeholder="Describe your product in detail"
                    className={textareaClass}
                  />
                </FieldLabel>

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldLabel label="Selling price" hint="Required">
                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={selected?.price ?? 0}
                      className={fieldClass}
                    />
                  </FieldLabel>
                  <FieldLabel label="Compare at price" hint="Optional">
                    <input
                      name="compareAtPrice"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={selected?.compareAtPrice ?? ""}
                      className={fieldClass}
                    />
                  </FieldLabel>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
                  <ProductImageUploader productName={selected?.name ?? "New product"} existingImages={selectedImages} />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Inventory & Stock"
              description="Keep SKU and stock levels aligned with the current warehouse state."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FieldLabel label="SKU" hint="Required">
                  <input name="sku" defaultValue={selected?.sku ?? ""} placeholder="SKU" className={fieldClass} />
                </FieldLabel>
                <FieldLabel label="Weight grams" hint="Legacy stock weight">
                  <input
                    name="weightGrams"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={selected?.weightGrams ?? 0}
                    className={fieldClass}
                  />
                </FieldLabel>
                <FieldLabel label="Available quantity" hint="Required">
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={selected?.stock ?? 0}
                    className={fieldClass}
                  />
                </FieldLabel>
                <FieldLabel label="Low stock threshold" hint="Alert level">
                  <input
                    name="lowStockThreshold"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={selected?.lowStockThreshold ?? 5}
                    className={fieldClass}
                  />
                </FieldLabel>
              </div>
            </SectionCard>

            <SectionCard
              title="Additional Details"
              description="Search and merchandising metadata that powers the admin list and future storefront integrations."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FieldLabel label="Product condition" hint="Merchandise state">
                  <select name="condition" defaultValue={selectedMetadata.condition} className={selectClass}>
                    {productConditionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FieldLabel>

                <FieldLabel label="Brand / manufacturer" hint="Required">
                  <select name="brandId" defaultValue={brandId} className={selectClass}>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </FieldLabel>

                <FieldLabel label="Tags" hint="Comma separated">
                  <input
                    name="tags"
                    defaultValue={selected?.tags.join(", ") ?? ""}
                    placeholder="top-seller, bundle"
                    className={fieldClass}
                  />
                </FieldLabel>

                <FieldLabel label="Search keywords" hint="Comma separated">
                  <input
                    name="searchKeywords"
                    defaultValue={selected?.searchKeywords?.join(", ") ?? ""}
                    placeholder="cotton, dress, summer"
                    className={fieldClass}
                  />
                </FieldLabel>

                <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
                  <ToggleField
                    name="featured"
                    label="Featured product"
                    hint="Promote this product in featured listings."
                    defaultChecked={selected?.featured ?? false}
                  />
                  <ToggleField
                    name="isActive"
                    label="Visible in catalog"
                    hint="Hide or show the product in admin-managed listings."
                    defaultChecked={selected?.isActive ?? true}
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-6">
            <SectionCard
              title="Product Categories"
              description="Keep the existing single-category mapping while preserving the screenshot-style grouped layout."
            >
              <div className="grid gap-4">
                <FieldLabel label="Category" hint="Required">
                  <select name="categoryId" defaultValue={categoryId} className={selectClass}>
                    {categories.length ? (
                      categories.map((categoryItem) => (
                        <option key={categoryItem.id} value={categoryItem.id}>
                          {categoryItem.name}
                        </option>
                      ))
                    ) : (
                      <option value="">No categories available</option>
                    )}
                  </select>
                </FieldLabel>
                <p className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs leading-5 text-slate-400">
                  This pass keeps one primary category and one brand record per product. Multi-category support can be added later if the storefront needs it.
                </p>
              </div>
            </SectionCard>

            <SectionCard
              title="Product Variants"
              description="Structured metadata for size, color, or bundle options without promoting variants to first-class tables yet."
            >
              <ProductVariantEditor initialGroups={selectedMetadata.variantGroups} />
            </SectionCard>

            <SectionCard
              title="Business Rules"
              description="Order and return logic that should round-trip through the backend now."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FieldLabel label="Minimum order quantity" hint="Required">
                  <input
                    name="minOrderQuantity"
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={selectedMetadata.minOrderQuantity}
                    className={fieldClass}
                  />
                </FieldLabel>
                <FieldLabel label="Maximum order quantity" hint="Optional">
                  <input
                    name="maxOrderQuantity"
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={selectedMetadata.maxOrderQuantity ?? ""}
                    className={fieldClass}
                  />
                </FieldLabel>
                <ToggleField
                  name="returnable"
                  label="Returnable"
                  hint="Allow customers to request returns."
                  defaultChecked={selectedMetadata.returnable}
                />
                <FieldLabel label="Return window (days)" hint="Optional">
                  <input
                    name="returnWindowDays"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={selectedMetadata.returnWindowDays ?? ""}
                    className={fieldClass}
                  />
                </FieldLabel>
                <FieldLabel label="Warranty text" className="md:col-span-2">
                  <textarea
                    name="warrantyText"
                    rows={3}
                    defaultValue={selectedMetadata.warrantyText ?? ""}
                    placeholder="Optional warranty or after-sales policy"
                    className={textareaClass}
                  />
                </FieldLabel>
                <FieldLabel label="Expiry date" hint="Optional">
                  <input
                    name="expiryDate"
                    type="date"
                    defaultValue={selectedMetadata.expiryDate ?? ""}
                    className={fieldClass}
                  />
                </FieldLabel>
              </div>
            </SectionCard>

            <SectionCard
              title="Shipping & Delivery"
              description="Physical product and packaging details for local fulfillment."
            >
              <div className="grid gap-4">
                <ToggleField
                  name="isPhysical"
                  label="Physical product"
                  hint="Disable this for service or digital items."
                  defaultChecked={selectedMetadata.isPhysical}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldLabel label="Handling time (days)" hint="Optional">
                    <input
                      name="handlingTimeDays"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={selectedMetadata.handlingTimeDays ?? ""}
                      className={fieldClass}
                    />
                  </FieldLabel>
                  <FieldLabel label="Shipping class" hint="Optional">
                    <input
                      name="shippingClass"
                      defaultValue={selectedMetadata.shippingClass ?? ""}
                      placeholder="standard, fragile, oversized"
                      className={fieldClass}
                    />
                  </FieldLabel>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <FieldLabel label="Package weight" hint="Optional">
                    <input
                      name="packageWeight"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={selectedMetadata.packageWeight ?? ""}
                      className={fieldClass}
                    />
                  </FieldLabel>
                  <FieldLabel label="Weight unit">
                    <select
                      name="packageWeightUnit"
                      defaultValue={selectedMetadata.packageWeightUnit ?? "kg"}
                      className={selectClass}
                    >
                      {productWeightUnitOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>
                </div>

                <div className="grid gap-4 md:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,0.8fr)]">
                  <FieldLabel label="Length">
                    <input
                      name="packageLength"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={selectedMetadata.packageLength ?? ""}
                      className={fieldClass}
                    />
                  </FieldLabel>
                  <FieldLabel label="Width">
                    <input
                      name="packageWidth"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={selectedMetadata.packageWidth ?? ""}
                      className={fieldClass}
                    />
                  </FieldLabel>
                  <FieldLabel label="Height">
                    <input
                      name="packageHeight"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={selectedMetadata.packageHeight ?? ""}
                      className={fieldClass}
                    />
                  </FieldLabel>
                  <FieldLabel label="Unit">
                    <select
                      name="packageDimensionsUnit"
                      defaultValue={selectedMetadata.packageDimensionsUnit ?? "cm"}
                      className={selectClass}
                    >
                      {productDimensionUnitOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleField
                    name="taxEnabled"
                    label="Tax enabled"
                    hint="Track whether tax should be applied later in checkout integrations."
                    defaultChecked={selectedMetadata.taxEnabled}
                  />
                  <ToggleField
                    name="discountEnabled"
                    label="Discount enabled"
                    hint="Controls whether this product can participate in discount logic."
                    defaultChecked={selectedMetadata.discountEnabled}
                  />
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-slate-400">
            Images are saved locally, metadata is persisted in the product record, and storefront changes stay untouched until the follow-up integration pass.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
              {selected ? "Update product" : "Create product"}
            </button>
            {selected ? (
              <Link
                href="/admin/products#product-editor"
                className="rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                Reset form
              </Link>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}
