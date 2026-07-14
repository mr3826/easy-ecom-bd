import Link from "next/link";
import type { ReactNode } from "react";
import { saveProductAction } from "@/app/admin/actions";
import { ProductImageUploader } from "@/components/admin/product-image-uploader";
import { ProductVariantEditor } from "@/components/admin/product-variant-editor";
import type { Brand, Category, Product, ProductImage } from "@/lib/domain";
import {
  normalizeProductMetadata,
  productConditionOptions,
  productDimensionUnitOptions,
  productWeightUnitOptions,
} from "@/lib/product-admin";

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

export function ProductEditorForm({
  product,
  categories,
  brands,
  existingImages,
  listHref = "/admin/products",
  createHref = "/admin/products/new",
}: {
  product: Product | null;
  categories: Category[];
  brands: Brand[];
  existingImages: ProductImage[];
  listHref?: string;
  createHref?: string;
}) {
  const selectedMetadata = normalizeProductMetadata(product?.metadata ?? null);
  const categoryId = product?.categoryId ?? categories[0]?.id ?? "";
  const brandId = product?.brandId ?? brands[0]?.id ?? "";

  return (
    <div className="space-y-8 text-slate-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={listHref} className="text-sm font-medium text-sky-300 transition hover:text-sky-200">
          ← Back to Products & Inventory
        </Link>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Add A Product</p>
      </div>

      <form action={saveProductAction} className="space-y-6 scroll-mt-24">
        <input type="hidden" name="id" value={product?.id ?? ""} />

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.22)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-200/80">Product editor</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{product ? "Edit product" : "Add A Product"}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Keep Bornohin branding intact while editing structured product, shipping, and inventory fields.
              </p>
            </div>
            {product ? (
              <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                Editing <span className="font-semibold text-white">{product.name}</span>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">New product mode</div>
            )}
          </div>
        </section>

        {product ? (
          <div className="rounded-[2rem] border border-sky-400/20 bg-sky-500/10 p-5 text-sky-50 shadow-[0_20px_60px_rgba(14,165,233,0.12)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/70">Editing mode</p>
                <p className="mt-2 text-sm leading-6 text-sky-50/90">
                  Changes will overwrite the selected product record and keep the public storefront stable for now.
                </p>
              </div>
              <Link
                href={createHref}
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
                    defaultValue={product?.name ?? ""}
                    placeholder="Enter product name"
                    className={fieldClass}
                  />
                </FieldLabel>

                <FieldLabel label="Slug" hint="Optional">
                  <input
                    name="slug"
                    defaultValue={product?.slug ?? ""}
                    placeholder="auto-generated from name"
                    className={fieldClass}
                  />
                </FieldLabel>

                <FieldLabel label="Description" hint="Required">
                  <textarea
                    name="description"
                    rows={5}
                    defaultValue={product?.description ?? ""}
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
                      defaultValue={product?.price ?? 0}
                      className={fieldClass}
                    />
                  </FieldLabel>
                  <FieldLabel label="Compare at price" hint="Optional">
                    <input
                      name="compareAtPrice"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={product?.compareAtPrice ?? ""}
                      className={fieldClass}
                    />
                  </FieldLabel>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
                  <ProductImageUploader productName={product?.name ?? "New product"} existingImages={existingImages} />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Inventory & Stock"
              description="Keep SKU and stock levels aligned with the current warehouse state."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FieldLabel label="SKU" hint="Required">
                  <input name="sku" defaultValue={product?.sku ?? ""} placeholder="SKU" className={fieldClass} />
                </FieldLabel>
                <FieldLabel label="Weight grams" hint="Legacy stock weight">
                  <input
                    name="weightGrams"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={product?.weightGrams ?? 0}
                    className={fieldClass}
                  />
                </FieldLabel>
                <FieldLabel label="Available quantity" hint="Required">
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={product?.stock ?? 0}
                    className={fieldClass}
                  />
                </FieldLabel>
                <FieldLabel label="Low stock threshold" hint="Alert level">
                  <input
                    name="lowStockThreshold"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={product?.lowStockThreshold ?? 5}
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
                    defaultValue={product?.tags.join(", ") ?? ""}
                    placeholder="top-seller, bundle"
                    className={fieldClass}
                  />
                </FieldLabel>

                <FieldLabel label="Search keywords" hint="Comma separated">
                  <input
                    name="searchKeywords"
                    defaultValue={product?.searchKeywords?.join(", ") ?? ""}
                    placeholder="cotton, dress, summer"
                    className={fieldClass}
                  />
                </FieldLabel>

                <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
                  <ToggleField
                    name="featured"
                    label="Featured product"
                    hint="Promote this product in featured listings."
                    defaultChecked={product?.featured ?? false}
                  />
                  <ToggleField
                    name="isActive"
                    label="Visible in catalog"
                    hint="Hide or show the product in admin-managed listings."
                    defaultChecked={product?.isActive ?? true}
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
                      categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
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
            <button type="submit" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
              {product ? "Update product" : "Create product"}
            </button>
            {product ? (
              <Link
                href={createHref}
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
