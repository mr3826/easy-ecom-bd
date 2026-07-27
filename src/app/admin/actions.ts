"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import {
  deleteBrand,
  deleteCategory,
  deleteProduct,
  createManualOrder,
  getOrder,
  getProduct,
  listBrands,
  listCategories,
  listProducts,
  listProductImages,
  setProductStock,
  upsertBrand,
  upsertCategory,
  upsertCoupon,
  upsertLandingPage,
  upsertLandingPageSection,
  upsertProduct,
  replaceProductImages,
  updateOrderDelivery,
  updateOrderPayment,
  updateOrderStatus,
  updateSettings,
} from "@/server/store";
import { getFileStorage } from "@/server/storage";
import { getBkashIntegrationConfig } from "@/server/integration-config";
import { assertRateLimit, buildSecurityKey, getClientIp, requireSameOrigin } from "@/server/security";
import { asNumber, asString } from "@/lib/utils";
import type { ProductVariantGroup } from "@/lib/domain";
import { parseProductUploadCsv } from "@/lib/product-import";
import {
  normalizeProductMetadata,
  normalizeProductVariantGroup,
  productConditionOptions,
  productDimensionUnitOptions,
  productWeightUnitOptions,
} from "@/lib/product-admin";

async function guard() {
  return requireAdmin();
}

async function requireAdminMutation(operation: string, actorId: string) {
  const requestHeaders = await requireSameOrigin(operation);
  assertRateLimit({
    scope: operation,
    key: buildSecurityKey(getClientIp(requestHeaders), actorId),
    limit: 300,
    windowMs: 10 * 60 * 1000,
  });
}

function readTrimmedString(formData: FormData, name: string) {
  return asString(formData.get(name)).trim();
}

function parseRequiredString(formData: FormData, name: string, label: string) {
  const value = readTrimmedString(formData, name);
  if (!value) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function parseBooleanValue(value: FormDataEntryValue | null, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  return ["true", "1", "on", "yes"].includes(value.toLowerCase());
}

function parseNumberField(
  formData: FormData,
  name: string,
  label: string,
  options: { required?: boolean; integer?: boolean; min?: number; max?: number; fallback?: number | null } = {},
) {
  const raw = readTrimmedString(formData, name);
  if (!raw) {
    if (options.required) {
      throw new Error(`${label} is required`);
    }
    return options.fallback ?? null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number`);
  }
  const normalized = options.integer ? Math.trunc(parsed) : parsed;
  if (options.min !== undefined && normalized < options.min) {
    throw new Error(`${label} must be at least ${options.min}`);
  }
  if (options.max !== undefined && normalized > options.max) {
    throw new Error(`${label} must be at most ${options.max}`);
  }
  return normalized;
}

function parseRequiredNonNegativeInteger(formData: FormData, name: string, label: string) {
  const value = parseNumberField(formData, name, label, {
    required: true,
    integer: true,
    min: 0,
  });
  if (value === null) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function parseOptionalDateString(formData: FormData, name: string, label: string) {
  const value = readTrimmedString(formData, name);
  if (!value) return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    throw new Error(`${label} must be a valid date`);
  }
  return value;
}

function parseSelectValue<T extends string>(
  formData: FormData,
  name: string,
  label: string,
  allowed: readonly T[],
  fallback: T,
) {
  const value = readTrimmedString(formData, name);
  if (!value) return fallback;
  if (!allowed.includes(value as T)) {
    throw new Error(`${label} is invalid`);
  }
  return value as T;
}

function parseCsvList(value: FormDataEntryValue | null) {
  return asString(value)
    .split(/[\r\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseVariantGroups(formData: FormData): ProductVariantGroup[] {
  const raw = readTrimmedString(formData, "variantGroupsJson");
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Variant groups must be valid JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Variant groups must be an array");
  }
  return parsed
    .map((group, index) => {
      if (!group || typeof group !== "object" || Array.isArray(group)) {
        throw new Error(`Variant group ${index + 1} is invalid`);
      }
      const source = group as Record<string, unknown>;
      const priceAdjustmentValue = source.priceAdjustment;
      const priceAdjustment =
        priceAdjustmentValue === null || priceAdjustmentValue === undefined || priceAdjustmentValue === ""
          ? 0
          : Number(priceAdjustmentValue);
      if (!Number.isFinite(priceAdjustment)) {
        throw new Error(`Variant group ${index + 1} price adjustment must be a valid number`);
      }
      const normalized = normalizeProductVariantGroup({ ...source, priceAdjustment });
      const hasContent = Boolean(normalized.name || normalized.options.length || normalized.priceAdjustment || normalized.sku);
      if (!hasContent) {
        return null;
      }
      if (!normalized.name) {
        throw new Error(`Variant group ${index + 1} needs a name`);
      }
      if (!normalized.options.length) {
        throw new Error(`Variant group ${index + 1} needs at least one option`);
      }
      return normalized;
  })
    .filter(Boolean) as ProductVariantGroup[];
}

function normalizeLookupKey(value: string) {
  return value.trim().toLowerCase();
}

function buildLookupMap<T extends { id: string; name: string; slug?: string }>(items: T[]) {
  const lookup = new Map<string, T>();
  for (const item of items) {
    lookup.set(normalizeLookupKey(item.id), item);
    lookup.set(normalizeLookupKey(item.name), item);
    if (item.slug) {
      lookup.set(normalizeLookupKey(item.slug), item);
    }
  }
  return lookup;
}

export async function saveCategoryAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("saveCategoryAction", actor.id);
  await upsertCategory({
    id: asString(formData.get("id")) || undefined,
    name: asString(formData.get("name")),
    slug: asString(formData.get("slug")) || undefined,
    description: asString(formData.get("description")),
    isActive: asString(formData.get("isActive")) !== "false",
  }, actor);
  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("deleteCategoryAction", actor.id);
  const id = asString(formData.get("id"));
  await deleteCategory(id, actor);
  revalidatePath("/admin/categories");
}

export async function saveBrandAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("saveBrandAction", actor.id);
  await upsertBrand({
    id: asString(formData.get("id")) || undefined,
    name: asString(formData.get("name")),
    slug: asString(formData.get("slug")) || undefined,
    description: asString(formData.get("description")),
    isActive: asString(formData.get("isActive")) !== "false",
  }, actor);
  revalidatePath("/admin/brands");
  redirect("/admin/brands");
}

export async function deleteBrandAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("deleteBrandAction", actor.id);
  await deleteBrand(asString(formData.get("id")), actor);
  revalidatePath("/admin/brands");
}

export async function saveProductAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("saveProductAction", actor.id);
  const productId = readTrimmedString(formData, "id");
  const existingProduct = productId ? await getProduct(productId) : null;
  const existingMetadata = normalizeProductMetadata(existingProduct?.metadata ?? null);
  const tags = parseCsvList(formData.get("tags"));
  const searchKeywords = parseCsvList(formData.get("searchKeywords")).map((item) => item.toLowerCase());
  const compareAtPrice = parseNumberField(formData, "compareAtPrice", "Compare at price", { integer: true, min: 0 });
  const product = await upsertProduct(
    {
      id: productId || undefined,
      name: parseRequiredString(formData, "name", "Product name"),
      slug: readTrimmedString(formData, "slug") || undefined,
      sku: readTrimmedString(formData, "sku") || undefined,
      description: parseRequiredString(formData, "description", "Product description"),
      price: parseNumberField(formData, "price", "Price", { required: true, integer: true, min: 0 }) as number,
      compareAtPrice:
        compareAtPrice === null || compareAtPrice === 0 ? undefined : (compareAtPrice as number),
      stock: parseNumberField(formData, "stock", "Stock", { required: true, integer: true, min: 0 }) as number,
      lowStockThreshold: (parseNumberField(formData, "lowStockThreshold", "Low stock threshold", {
        integer: true,
        min: 0,
        fallback: 5,
      }) ?? 5) as number,
      categoryId: parseRequiredString(formData, "categoryId", "Category"),
      brandId: parseRequiredString(formData, "brandId", "Brand"),
      isActive: parseBooleanValue(formData.get("isActive"), true),
      featured: parseBooleanValue(formData.get("featured"), false),
      weightGrams: (parseNumberField(formData, "weightGrams", "Weight grams", {
        integer: true,
        min: 0,
        fallback: 0,
      }) ?? 0) as number,
      tags,
      searchKeywords,
      metadata: {
        ...existingMetadata,
        condition: parseSelectValue(
          formData,
          "condition",
          "Condition",
          productConditionOptions.map((option) => option.value),
          "new",
        ),
        isPhysical: parseBooleanValue(formData.get("isPhysical"), true),
        minOrderQuantity: (parseNumberField(formData, "minOrderQuantity", "Minimum order quantity", {
          required: true,
          integer: true,
          min: 1,
        }) ?? 1) as number,
        maxOrderQuantity: parseNumberField(formData, "maxOrderQuantity", "Maximum order quantity", {
          integer: true,
          min: 1,
        }),
        returnable: parseBooleanValue(formData.get("returnable"), true),
        returnWindowDays: parseNumberField(formData, "returnWindowDays", "Return window", {
          integer: true,
          min: 0,
        }),
        warrantyText: readTrimmedString(formData, "warrantyText") || null,
        expiryDate: parseOptionalDateString(formData, "expiryDate", "Expiry date"),
        handlingTimeDays: parseNumberField(formData, "handlingTimeDays", "Handling time", {
          integer: true,
          min: 0,
        }),
        shippingClass: readTrimmedString(formData, "shippingClass") || null,
        packageWeight: parseNumberField(formData, "packageWeight", "Package weight", {
          min: 0,
        }),
        packageWeightUnit: parseSelectValue(
          formData,
          "packageWeightUnit",
          "Package weight unit",
          productWeightUnitOptions.map((option) => option.value),
          "kg",
        ),
        packageLength: parseNumberField(formData, "packageLength", "Package length", { min: 0 }),
        packageWidth: parseNumberField(formData, "packageWidth", "Package width", { min: 0 }),
        packageHeight: parseNumberField(formData, "packageHeight", "Package height", { min: 0 }),
        packageDimensionsUnit: parseSelectValue(
          formData,
          "packageDimensionsUnit",
          "Package dimensions unit",
          productDimensionUnitOptions.map((option) => option.value),
          "cm",
        ),
        taxEnabled: parseBooleanValue(formData.get("taxEnabled"), true),
        discountEnabled: parseBooleanValue(formData.get("discountEnabled"), true),
        variantGroups: parseVariantGroups(formData),
      },
    },
    actor,
  );

  const existingImageUrls = formData
    .getAll("retainedImageUrls")
    .map((item) => asString(item).trim())
    .filter(Boolean);
  const imageEditorTouched = asString(formData.get("productImagesTouched")) === "1";
  const uploadedFiles = formData
    .getAll("productImages")
    .filter((item): item is File => item instanceof File && item.size > 0);
  for (const file of uploadedFiles) {
    if (file.type && !file.type.startsWith("image/")) {
      throw new Error(`Product image ${file.name || "upload"} must be an image`);
    }
  }
  const storage = getFileStorage();
  const uploadedImageUrls = uploadedFiles.length
    ? (
        await Promise.all(
          uploadedFiles.map(async (file) => {
            const stored = await storage.save(file, `products/${product.id}`);
            return stored.url;
          }),
        )
      )
    : [];
  const currentImageUrls = imageEditorTouched
    ? existingImageUrls
    : (await listProductImages(product.id)).map((image) => image.url);
  const nextImageUrls = [...currentImageUrls, ...uploadedImageUrls];
  if (imageEditorTouched || uploadedImageUrls.length || existingImageUrls.length) {
    await replaceProductImages(product.id, nextImageUrls, product.name);
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  revalidatePath(`/product/${product.slug}`);
  if (existingProduct?.slug && existingProduct.slug !== product.slug) {
    revalidatePath(`/product/${existingProduct.slug}`);
  }
  redirect("/admin/products");
}

export async function bulkUploadProductsAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("bulkUploadProductsAction", actor.id);
  const file = formData.get("productFile");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Product file is required");
  }
  if (file.name && !file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("Upload file must be a CSV file");
  }

  const content = await file.text();
  const rows = parseProductUploadCsv(content);
  const [categories, brands, products] = await Promise.all([listCategories(), listBrands(), listProducts()]);
  const categoryLookup = buildLookupMap(categories);
  const brandLookup = buildLookupMap(brands);
  const productLookup = new Map<string, (typeof products)[number]>();
  for (const product of products) {
    productLookup.set(normalizeLookupKey(product.id), product);
    productLookup.set(normalizeLookupKey(product.sku), product);
  }

  for (const row of rows) {
    if (!row.record.name.trim()) {
      throw new Error(`Row ${row.lineNumber}: Product name is required`);
    }
    if (!row.record.description.trim()) {
      throw new Error(`Row ${row.lineNumber}: Product description is required`);
    }

    const category = categoryLookup.get(normalizeLookupKey(row.categoryRef));
    if (!category) {
      throw new Error(`Row ${row.lineNumber}: Category "${row.categoryRef}" was not found`);
    }

    const brand = brandLookup.get(normalizeLookupKey(row.brandRef));
    if (!brand) {
      throw new Error(`Row ${row.lineNumber}: Brand "${row.brandRef}" was not found`);
    }

    const sku = row.record.sku.trim();
    const existingProduct = sku ? productLookup.get(normalizeLookupKey(sku)) ?? null : null;
    const product = await upsertProduct(
      {
        id: existingProduct?.id,
        name: row.record.name.trim(),
        slug: row.record.slug.trim() || undefined,
        sku: sku || undefined,
        description: row.record.description.trim(),
        price: row.price,
        compareAtPrice: row.compareAtPrice ?? undefined,
        stock: row.stock,
        lowStockThreshold: row.lowStockThreshold,
        categoryId: category.id,
        brandId: brand.id,
        isActive: parseBooleanValue(row.record.isActive, true),
        featured: parseBooleanValue(row.record.featured, false),
        weightGrams: row.weightGrams,
        tags: row.tags,
        searchKeywords: row.searchKeywords,
        metadata: row.metadata,
      },
      actor,
    );

    if (row.imageUrls.length > 0) {
      await replaceProductImages(product.id, row.imageUrls, product.name);
    }

    if (existingProduct?.slug && existingProduct.slug !== product.slug) {
      revalidatePath(`/product/${existingProduct.slug}`);
    }
    revalidatePath(`/product/${product.slug}`);

    productLookup.set(normalizeLookupKey(product.id), product);
    productLookup.set(normalizeLookupKey(product.sku), product);
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  redirect(`/admin/products?imported=${rows.length}`);
}

export async function deleteProductAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("deleteProductAction", actor.id);
  await deleteProduct(asString(formData.get("id")), actor);
  revalidatePath("/admin/products");
}

export async function adjustInventoryAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("adjustInventoryAction", actor.id);
  await setProductStock(
    asString(formData.get("productId")),
    asNumber(formData.get("change")),
    asString(formData.get("reason")),
    actor,
  );
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
}

export async function saveCouponAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("saveCouponAction", actor.id);
  await upsertCoupon({
    id: asString(formData.get("id")) || undefined,
    code: asString(formData.get("code")),
    description: asString(formData.get("description")),
    type: asString(formData.get("type")) as "percentage" | "fixed",
    value: asNumber(formData.get("value")),
    minOrderAmount: asNumber(formData.get("minOrderAmount")),
    isActive: asString(formData.get("isActive")) !== "false",
  }, actor);
  revalidatePath("/admin/coupons");
  revalidatePath("/checkout");
}

export async function saveSettingsAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("saveSettingsAction", actor.id);
  try {
    const deliveryAreas = parseCsvList(formData.get("deliveryAreas"));
    if (!deliveryAreas.length) {
      throw new Error("At least one delivery area is required");
    }
    const bkashEnabled = asString(formData.get("bkashEnabled")) === "on";
    if (bkashEnabled && !getBkashIntegrationConfig().enabled) {
      throw new Error("bKash gateway credentials must be configured before bKash can be enabled");
    }

    await updateSettings({
      storeName: parseRequiredString(formData, "storeName", "Store name"),
      logoText: parseRequiredString(formData, "logoText", "Logo text"),
      logoUrl: readTrimmedString(formData, "logoUrl") || null,
      supportEmail: readTrimmedString(formData, "supportEmail") || null,
      contactNumber: parseRequiredString(formData, "contactNumber", "Contact number"),
      address: parseRequiredString(formData, "address", "Shop address"),
      businessHours: parseRequiredString(formData, "businessHours", "Business hours"),
      deliveryAreas,
      returnRefundPolicy: parseRequiredString(formData, "returnRefundPolicy", "Return/refund policy"),
      confirmationMessageTemplate: parseRequiredString(
        formData,
        "confirmationMessageTemplate",
        "Order confirmation message",
      ),
      metaPixelId: readTrimmedString(formData, "metaPixelId") || null,
      gtmContainerId: readTrimmedString(formData, "gtmContainerId") || null,
      freeDeliveryThreshold: parseRequiredNonNegativeInteger(
        formData,
        "freeDeliveryThreshold",
        "Free delivery threshold",
      ),
      codEnabled: asString(formData.get("codEnabled")) === "on",
      bkashEnabled,
      bkashAccountNumber: readTrimmedString(formData, "bkashAccountNumber") || null,
      bkashInstructions: readTrimmedString(formData, "bkashInstructions"),
      nagadEnabled: asString(formData.get("nagadEnabled")) === "on",
      nagadAccountNumber: readTrimmedString(formData, "nagadAccountNumber") || null,
      nagadInstructions: readTrimmedString(formData, "nagadInstructions"),
      rocketEnabled: asString(formData.get("rocketEnabled")) === "on",
      rocketAccountNumber: readTrimmedString(formData, "rocketAccountNumber") || null,
      rocketInstructions: readTrimmedString(formData, "rocketInstructions"),
      insideDhakaDeliveryCharge: parseRequiredNonNegativeInteger(
        formData,
        "insideDhakaDeliveryCharge",
        "Inside Dhaka delivery charge",
      ),
      subDhakaDeliveryCharge: parseRequiredNonNegativeInteger(
        formData,
        "subDhakaDeliveryCharge",
        "Sub-Dhaka delivery charge",
      ),
      outsideDhakaDeliveryCharge: parseRequiredNonNegativeInteger(
        formData,
        "outsideDhakaDeliveryCharge",
        "Outside Dhaka delivery charge",
      ),
      insideDhakaCodEnabled: asString(formData.get("insideDhakaCodEnabled")) === "on",
      subDhakaCodEnabled: asString(formData.get("subDhakaCodEnabled")) === "on",
      outsideDhakaCodEnabled: asString(formData.get("outsideDhakaCodEnabled")) === "on",
    }, actor);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Store settings could not be saved";
    redirect(`/admin/settings?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/terms");
  revalidatePath("/track-order");
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

export async function createManualOrderAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("createManualOrderAction", actor.id);
  const productIds = formData.getAll("productId").map((item) => asString(item));
  const quantities = formData.getAll("quantity").map((item) => asNumber(item, 1));
  await createManualOrder({
    customerName: asString(formData.get("customerName")),
    customerPhone: asString(formData.get("customerPhone")),
    customerEmail: asString(formData.get("customerEmail")) || undefined,
    district: asString(formData.get("district")),
    shippingAddress: asString(formData.get("shippingAddress")),
    status: asString(formData.get("status")) as "draft" | "pending" | "confirmed" | "cancelled" | "delivered",
    paymentProvider: asString(formData.get("paymentProvider")) as "cod" | "bkash" | "nagad" | "rocket",
    paymentStatus: asString(formData.get("paymentStatus")) as "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded",
    deliveryZone: asString(formData.get("deliveryZone")) as "inside_dhaka" | "sub_dhaka" | "outside_dhaka",
    discountAmount: asNumber(formData.get("discountAmount")),
    notes: asString(formData.get("notes")) || undefined,
    adminNotes: asString(formData.get("adminNotes")) || undefined,
    items: productIds
      .map((productId, index) => ({ productId, quantity: quantities[index] ?? 1 }))
      .filter((item) => item.productId),
  }, actor);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function updateOrderStatusAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("updateOrderStatusAction", actor.id);
  await updateOrderStatus(
    asString(formData.get("orderId")),
    asString(formData.get("status")) as "draft" | "pending" | "confirmed" | "cancelled" | "delivered",
    actor,
    asString(formData.get("note")) || undefined,
  );
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function saveLandingPageAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("saveLandingPageAction", actor.id);
  const landingPage = await upsertLandingPage({
    id: asString(formData.get("id")) || undefined,
    slug: asString(formData.get("slug")),
    title: asString(formData.get("title")),
    metaDescription: asString(formData.get("metaDescription")),
    heroTitle: asString(formData.get("heroTitle")),
    heroSubtitle: asString(formData.get("heroSubtitle")),
    bannerImageUrl: asString(formData.get("bannerImageUrl")) || undefined,
    published: asString(formData.get("published")) === "on",
    attachedProductIds: asString(formData.get("attachedProductIds"))
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  }, actor);
  revalidatePath("/admin/landing-pages");
  revalidatePath(`/l/${landingPage.slug}`);
  if (landingPage.slug === "home") {
    revalidatePath("/");
  }
}

export async function saveLandingPageSectionAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("saveLandingPageSectionAction", actor.id);
  const landingPageId = asString(formData.get("landingPageId"));
  const type = asString(formData.get("type")) as
    | "banner"
    | "carousel"
    | "title"
    | "subtitle"
    | "product_section"
    | "faq"
    | "testimonials"
    | "cta";
  await upsertLandingPageSection({
    id: asString(formData.get("id")) || undefined,
    landingPageId,
    type,
    title: asString(formData.get("title")) || undefined,
    subtitle: asString(formData.get("subtitle")) || undefined,
    body: asString(formData.get("body")) || undefined,
    imageUrl: asString(formData.get("imageUrl")) || undefined,
    productIds: asString(formData.get("productIds"))
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    items: JSON.parse(asString(formData.get("itemsJson")) || "[]"),
    ctaLabel: asString(formData.get("ctaLabel")) || undefined,
    ctaHref: asString(formData.get("ctaHref")) || undefined,
    sortOrder: asNumber(formData.get("sortOrder")),
  }, actor);
  revalidatePath("/admin/landing-pages");
  revalidatePath("/");
}

export async function toggleOrderPaymentAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("toggleOrderPaymentAction", actor.id);
  const orderId = asString(formData.get("orderId"));
  const status = asString(formData.get("status")) as
    | "pending"
    | "processing"
    | "paid"
    | "failed"
    | "cancelled"
    | "refunded";
  const order = await getOrder(orderId);
  if (order) {
    await updateOrderPayment(orderId, { paymentStatus: status }, actor);
    revalidatePath("/admin/orders");
    revalidatePath("/admin/payments");
    revalidatePath("/orders");
  }
}

export async function toggleOrderDeliveryAction(formData: FormData) {
  const actor = await guard();
  await requireAdminMutation("toggleOrderDeliveryAction", actor.id);
  const orderId = asString(formData.get("orderId"));
  const status = asString(formData.get("status")) as
    | "pending"
    | "picked_up"
    | "in_transit"
    | "delivered"
    | "returned"
    | "cancelled";
  const order = await getOrder(orderId);
  if (order) {
    await updateOrderDelivery(orderId, status, actor);
    revalidatePath("/admin/orders");
  }
}
