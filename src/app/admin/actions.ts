"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPathaoShipment,
  createRedxShipment,
  createSteadfastShipment,
  syncCourierStatus,
} from "@/server/integrations";
import { requireAdmin } from "@/server/auth";
import {
  deleteBrand,
  deleteCategory,
  deleteProduct,
  createManualOrder,
  getOrder,
  setProductStock,
  upsertBrand,
  upsertCategory,
  upsertCoupon,
  upsertLandingPage,
  upsertLandingPageSection,
  upsertProduct,
  updateOrderDelivery,
  updateOrderPayment,
  updateOrderStatus,
  updateSettings,
  getSettings,
  assertDeliveryProviderAvailable,
} from "@/server/store";
import { asNumber, asString } from "@/lib/utils";

async function guard() {
  return requireAdmin();
}

export async function saveCategoryAction(formData: FormData) {
  const actor = await guard();
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
  const id = asString(formData.get("id"));
  await deleteCategory(id, actor);
  revalidatePath("/admin/categories");
}

export async function saveBrandAction(formData: FormData) {
  const actor = await guard();
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
  await deleteBrand(asString(formData.get("id")), actor);
  revalidatePath("/admin/brands");
}

export async function saveProductAction(formData: FormData) {
  const actor = await guard();
  const tags = asString(formData.get("tags"))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const searchKeywords = asString(formData.get("searchKeywords"))
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const imageUrls = asString(formData.get("imageUrls"))
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  await upsertProduct({
    id: asString(formData.get("id")) || undefined,
    name: asString(formData.get("name")),
    slug: asString(formData.get("slug")) || undefined,
    sku: asString(formData.get("sku")) || undefined,
    description: asString(formData.get("description")),
    price: asNumber(formData.get("price")),
    compareAtPrice: asNumber(formData.get("compareAtPrice"), 0) || undefined,
    stock: asNumber(formData.get("stock")),
    lowStockThreshold: asNumber(formData.get("lowStockThreshold"), 5),
    categoryId: asString(formData.get("categoryId")),
    brandId: asString(formData.get("brandId")),
    isActive: asString(formData.get("isActive")) !== "false",
    featured: asString(formData.get("featured")) === "true",
    weightGrams: asNumber(formData.get("weightGrams")),
    tags,
    searchKeywords,
    imageUrls,
  }, actor);
  revalidatePath("/products");
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteProductAction(formData: FormData) {
  const actor = await guard();
  await deleteProduct(asString(formData.get("id")), actor);
  revalidatePath("/products");
  revalidatePath("/admin/products");
}

export async function adjustInventoryAction(formData: FormData) {
  const actor = await guard();
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
  const deliveryAreas = asString(formData.get("deliveryAreas"))
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  await updateSettings({
    storeName: asString(formData.get("storeName")),
    logoText: asString(formData.get("logoText")),
    logoUrl: asString(formData.get("logoUrl")) || undefined,
    supportEmail: asString(formData.get("supportEmail")) || undefined,
    contactNumber: asString(formData.get("contactNumber")),
    address: asString(formData.get("address")),
    businessHours: asString(formData.get("businessHours")),
    deliveryAreas,
    returnRefundPolicy: asString(formData.get("returnRefundPolicy")),
    confirmationMessageTemplate: asString(formData.get("confirmationMessageTemplate")),
    metaPixelId: asString(formData.get("metaPixelId")) || undefined,
    gtmContainerId: asString(formData.get("gtmContainerId")) || undefined,
    deliveryCharge: asNumber(formData.get("deliveryCharge")),
    freeDeliveryThreshold: asNumber(formData.get("freeDeliveryThreshold")),
    codEnabled: asString(formData.get("codEnabled")) === "on",
    bkashEnabled: asString(formData.get("bkashEnabled")) === "on",
    bkashAccountNumber: asString(formData.get("bkashAccountNumber")) || undefined,
    bkashInstructions: asString(formData.get("bkashInstructions")),
    nagadEnabled: asString(formData.get("nagadEnabled")) === "on",
    nagadAccountNumber: asString(formData.get("nagadAccountNumber")) || undefined,
    nagadInstructions: asString(formData.get("nagadInstructions")),
    rocketEnabled: asString(formData.get("rocketEnabled")) === "on",
    rocketAccountNumber: asString(formData.get("rocketAccountNumber")) || undefined,
    rocketInstructions: asString(formData.get("rocketInstructions")),
    insideDhakaDeliveryCharge: asNumber(formData.get("insideDhakaDeliveryCharge")),
    subDhakaDeliveryCharge: asNumber(formData.get("subDhakaDeliveryCharge")),
    outsideDhakaDeliveryCharge: asNumber(formData.get("outsideDhakaDeliveryCharge")),
    insideDhakaCodEnabled: asString(formData.get("insideDhakaCodEnabled")) === "on",
    subDhakaCodEnabled: asString(formData.get("subDhakaCodEnabled")) === "on",
    outsideDhakaCodEnabled: asString(formData.get("outsideDhakaCodEnabled")) === "on",
    pathaoEnabled: asString(formData.get("pathaoEnabled")) === "on",
    steadfastEnabled: asString(formData.get("steadfastEnabled")) === "on",
    redxEnabled: asString(formData.get("redxEnabled")) === "on",
  }, actor);
  revalidatePath("/");
  revalidatePath("/admin/settings");
}

export async function createManualOrderAction(formData: FormData) {
  const actor = await guard();
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
    deliveryProvider: (asString(formData.get("deliveryProvider")) || undefined) as "pathao" | "steadfast" | "redx" | undefined,
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
}

export async function saveLandingPageSectionAction(formData: FormData) {
  const actor = await guard();
  const landingPageId = asString(formData.get("landingPageId"));
  const type = asString(formData.get("type")) as
    | "banner"
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
}

export async function toggleOrderPaymentAction(formData: FormData) {
  const actor = await guard();
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
  const orderId = asString(formData.get("orderId"));
  const status = asString(formData.get("status")) as
    | "pending"
    | "courier_created"
    | "picked_up"
    | "in_transit"
    | "delivered"
    | "returned"
    | "cancelled";
  const order = await getOrder(orderId);
  if (order) {
    await updateOrderDelivery(orderId, status, actor);
    revalidatePath("/admin/orders");
    revalidatePath("/admin/deliveries");
  }
}

export async function createCourierShipmentAction(formData: FormData) {
  const actor = await guard();
  const orderId = asString(formData.get("orderId"));
  const courierKey = asString(formData.get("courierKey"));
  const order = await getOrder(orderId);
  if (!order) return;
  const settings = await getSettings();
  assertDeliveryProviderAvailable(settings, courierKey as "pathao" | "steadfast" | "redx");
  const payload = {
    orderId: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAddress: order.shippingAddress,
    district: order.district,
    actor,
  };
  if (courierKey === "pathao") await createPathaoShipment(payload);
  else if (courierKey === "redx") await createRedxShipment(payload);
  else await createSteadfastShipment(payload);
  revalidatePath("/admin/deliveries");
  revalidatePath("/admin/orders");
}

export async function syncShipmentStatusAction(formData: FormData) {
  const actor = await guard();
  await syncCourierStatus(
    asString(formData.get("shipmentId")),
    asString(formData.get("status")) as
      | "picked_up"
      | "in_transit"
      | "delivered"
      | "returned"
      | "cancelled",
    actor,
  );
  revalidatePath("/admin/deliveries");
}
