"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPathaoShipment,
  createSteadfastShipment,
  syncCourierStatus,
} from "@/server/integrations";
import { requireAdmin } from "@/server/auth";
import {
  deleteBrand,
  deleteCategory,
  deleteProduct,
  getOrder,
  resetState,
  setProductStock,
  upsertBrand,
  upsertCategory,
  upsertCoupon,
  upsertLandingPage,
  upsertLandingPageSection,
  upsertProduct,
  updateOrderDelivery,
  updateOrderPayment,
  updateSettings,
} from "@/server/store";
import { asNumber, asString } from "@/lib/utils";

async function guard() {
  return requireAdmin();
}

export async function saveCategoryAction(formData: FormData) {
  await guard();
  upsertCategory({
    id: asString(formData.get("id")) || undefined,
    name: asString(formData.get("name")),
    slug: asString(formData.get("slug")) || undefined,
    description: asString(formData.get("description")),
    isActive: asString(formData.get("isActive")) !== "false",
  });
  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  await guard();
  const id = asString(formData.get("id"));
  deleteCategory(id);
  revalidatePath("/admin/categories");
}

export async function saveBrandAction(formData: FormData) {
  await guard();
  upsertBrand({
    id: asString(formData.get("id")) || undefined,
    name: asString(formData.get("name")),
    slug: asString(formData.get("slug")) || undefined,
    description: asString(formData.get("description")),
    isActive: asString(formData.get("isActive")) !== "false",
  });
  revalidatePath("/admin/brands");
  redirect("/admin/brands");
}

export async function deleteBrandAction(formData: FormData) {
  await guard();
  deleteBrand(asString(formData.get("id")));
  revalidatePath("/admin/brands");
}

export async function saveProductAction(formData: FormData) {
  await guard();
  const tags = asString(formData.get("tags"))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  upsertProduct({
    id: asString(formData.get("id")) || undefined,
    name: asString(formData.get("name")),
    slug: asString(formData.get("slug")) || undefined,
    sku: asString(formData.get("sku")) || undefined,
    description: asString(formData.get("description")),
    price: asNumber(formData.get("price")),
    compareAtPrice: asNumber(formData.get("compareAtPrice"), 0) || undefined,
    stock: asNumber(formData.get("stock")),
    categoryId: asString(formData.get("categoryId")),
    brandId: asString(formData.get("brandId")),
    isActive: asString(formData.get("isActive")) !== "false",
    featured: asString(formData.get("featured")) === "true",
    weightGrams: asNumber(formData.get("weightGrams")),
    tags,
  });
  revalidatePath("/products");
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteProductAction(formData: FormData) {
  await guard();
  deleteProduct(asString(formData.get("id")));
  revalidatePath("/products");
  revalidatePath("/admin/products");
}

export async function adjustInventoryAction(formData: FormData) {
  await guard();
  setProductStock(asString(formData.get("productId")), asNumber(formData.get("change")), asString(formData.get("reason")));
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
}

export async function saveCouponAction(formData: FormData) {
  await guard();
  upsertCoupon({
    id: asString(formData.get("id")) || undefined,
    code: asString(formData.get("code")),
    description: asString(formData.get("description")),
    type: asString(formData.get("type")) as "percentage" | "fixed",
    value: asNumber(formData.get("value")),
    minOrderAmount: asNumber(formData.get("minOrderAmount")),
    isActive: asString(formData.get("isActive")) !== "false",
  });
  revalidatePath("/admin/coupons");
  revalidatePath("/checkout");
}

export async function saveSettingsAction(formData: FormData) {
  await guard();
  updateSettings({
    storeName: asString(formData.get("storeName")),
    logoText: asString(formData.get("logoText")),
    contactNumber: asString(formData.get("contactNumber")),
    deliveryCharge: asNumber(formData.get("deliveryCharge")),
    freeDeliveryThreshold: asNumber(formData.get("freeDeliveryThreshold")),
    bkashEnabled: asString(formData.get("bkashEnabled")) === "on",
    nagadEnabled: asString(formData.get("nagadEnabled")) === "on",
    pathaoEnabled: asString(formData.get("pathaoEnabled")) === "on",
    steadfastEnabled: asString(formData.get("steadfastEnabled")) === "on",
  });
  revalidatePath("/");
  revalidatePath("/admin/settings");
}

export async function saveLandingPageAction(formData: FormData) {
  await guard();
  const landingPage = upsertLandingPage({
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
  });
  revalidatePath("/admin/landing-pages");
  revalidatePath(`/l/${landingPage.slug}`);
}

export async function saveLandingPageSectionAction(formData: FormData) {
  await guard();
  const landingPageId = asString(formData.get("landingPageId"));
  const type = asString(formData.get("type")) as
    | "banner"
    | "title"
    | "subtitle"
    | "product_section"
    | "faq"
    | "testimonials"
    | "cta";
  upsertLandingPageSection({
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
  });
  revalidatePath("/admin/landing-pages");
}

export async function toggleOrderPaymentAction(formData: FormData) {
  await guard();
  const orderId = asString(formData.get("orderId"));
  const status = asString(formData.get("status")) as
    | "pending"
    | "processing"
    | "paid"
    | "failed"
    | "cancelled"
    | "refunded";
  const order = getOrder(orderId);
  if (order) {
    updateOrderPayment(orderId, { paymentStatus: status });
    revalidatePath("/admin/orders");
    revalidatePath("/admin/payments");
    revalidatePath("/orders");
  }
}

export async function toggleOrderDeliveryAction(formData: FormData) {
  await guard();
  const orderId = asString(formData.get("orderId"));
  const status = asString(formData.get("status")) as
    | "pending"
    | "courier_created"
    | "picked_up"
    | "in_transit"
    | "delivered"
    | "returned"
    | "cancelled";
  const order = getOrder(orderId);
  if (order) {
    updateOrderDelivery(orderId, status);
    revalidatePath("/admin/orders");
    revalidatePath("/admin/deliveries");
  }
}

export async function createCourierShipmentAction(formData: FormData) {
  await guard();
  const orderId = asString(formData.get("orderId"));
  const courierKey = asString(formData.get("courierKey"));
  const order = getOrder(orderId);
  if (!order) return;
  const payload = {
    orderId: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAddress: order.shippingAddress,
  };
  if (courierKey === "pathao") await createPathaoShipment(payload);
  else await createSteadfastShipment(payload);
  revalidatePath("/admin/deliveries");
  revalidatePath("/admin/orders");
}

export async function syncShipmentStatusAction(formData: FormData) {
  await guard();
  syncCourierStatus(
    asString(formData.get("shipmentId")),
    asString(formData.get("status")) as
      | "picked_up"
      | "in_transit"
      | "delivered"
      | "returned"
      | "cancelled",
  );
  revalidatePath("/admin/deliveries");
}

export async function resetDemoAction() {
  await guard();
  resetState();
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/products");
  redirect("/admin");
}
