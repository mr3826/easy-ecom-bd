"use server";

import { randomUUID } from "crypto";
import { compareSync, hashSync } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addToCart,
  createOrderFromCart,
  createUser,
  getCartSummary,
  getProduct,
  getOrCreateCart,
  findUserByEmail,
  listProducts,
  removeCartItem,
  updateCartQuantity,
  clearCart,
} from "@/server/store";
import { asNumber, asString } from "@/lib/utils";
import { initiateBkashPayment } from "@/server/integrations";
import { getBkashIntegrationConfig } from "@/server/integration-config";
import { clearSessionCookie, getCurrentUser, setSessionCookie } from "@/server/auth";
import { assertRateLimit, buildSecurityKey, getClientIp, requireSameOrigin } from "@/server/security";

const guestCookie = "easy_ecom_guest";

async function getGuestKey() {
  const cookieStore = await cookies();
  let value = cookieStore.get(guestCookie)?.value;
  if (!value) {
    value = `guest-${randomUUID()}`;
    cookieStore.set(guestCookie, value, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return value;
}

async function requireActionOrigin(operation: string) {
  return requireSameOrigin(operation);
}

async function resolveProductFromFormValue(productKey: string) {
  const byId = await getProduct(productKey);
  if (byId) {
    return byId;
  }
  const products = await listProducts();
  return products.find((product) => product.slug === productKey) ?? null;
}

export async function addToCartAction(formData: FormData) {
  await requireActionOrigin("addToCartAction");
  const productId = asString(formData.get("productId"));
  const quantity = asNumber(formData.get("quantity"), 1);
  const user = await getCurrentUser();
  const guestKey = await getGuestKey();
  const product = await resolveProductFromFormValue(productId);
  if (!product) {
    throw new Error("Product not found");
  }
  await addToCart(guestKey, product.id, quantity, user?.id, user ?? null);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/search");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath(`/product/${product.slug}`);
}

export async function updateCartQuantityAction(formData: FormData) {
  await requireActionOrigin("updateCartQuantityAction");
  const productId = asString(formData.get("productId"));
  const quantity = asNumber(formData.get("quantity"), 1);
  const guestKey = await getGuestKey();
  const user = await getCurrentUser();
  await updateCartQuantity(guestKey, productId, quantity, user?.id, user ?? null);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/search");
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function removeCartItemAction(formData: FormData) {
  await requireActionOrigin("removeCartItemAction");
  const productId = asString(formData.get("productId"));
  const guestKey = await getGuestKey();
  const user = await getCurrentUser();
  await removeCartItem(guestKey, productId, user?.id, user ?? null);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/search");
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function clearCartAction() {
  await requireActionOrigin("clearCartAction");
  const guestKey = await getGuestKey();
  const user = await getCurrentUser();
  await clearCart(guestKey, user?.id, user ?? null);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/search");
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function registerAction(formData: FormData) {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    phone: z.string().min(7).optional(),
  });

  const parsed = schema.safeParse({
    name: asString(formData.get("name")),
    email: asString(formData.get("email")),
    password: asString(formData.get("password")),
    phone: asString(formData.get("phone")) || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid registration details");
  }

  const requestHeaders = await requireActionOrigin("registerAction");
  assertRateLimit({
    scope: "registerAction",
    key: buildSecurityKey(getClientIp(requestHeaders), parsed.data.email.toLowerCase()),
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    throw new Error("An account already exists for this email address");
  }

  const user = await createUser({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash: hashSync(parsed.data.password, 10),
    phone: parsed.data.phone,
    role: "customer",
  });
  await setSessionCookie(user.id);
  revalidatePath("/");
  redirect("/account");
}

export async function loginAction(formData: FormData) {
  const email = asString(formData.get("email"));
  const password = asString(formData.get("password"));
  const requestHeaders = await requireActionOrigin("loginAction");
  assertRateLimit({
    scope: "loginAction",
    key: buildSecurityKey(getClientIp(requestHeaders), email.toLowerCase()),
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  const user = await findUserByEmail(email);

  if (!user || !compareSync(password, user.passwordHash)) {
    throw new Error("The email or password is not correct");
  }

  await setSessionCookie(user.id);
  revalidatePath("/");
  redirect(user.role === "admin" ? "/admin" : "/account");
}

export async function logoutAction() {
  await requireActionOrigin("logoutAction");
  await clearSessionCookie();
  redirect("/");
}

export async function checkoutAction(formData: FormData) {
  const requestHeaders = await requireActionOrigin("checkoutAction");
  const paymentMethod = (asString(formData.get("paymentMethod")) || "cod") as "cod" | "bkash" | "nagad" | "rocket";
  const wantsBkash = paymentMethod === "bkash";
  const customerName = asString(formData.get("customerName"));
  const customerPhone = asString(formData.get("customerPhone"));
  const customerEmail = asString(formData.get("customerEmail")) || undefined;
  const district = asString(formData.get("district"));
  const shippingAddress = asString(formData.get("shippingAddress"));
  const notes = asString(formData.get("notes")) || undefined;
  const couponCode = asString(formData.get("couponCode")) || undefined;
  const guestKey = await getGuestKey();
  const user = await getCurrentUser();
  assertRateLimit({
    scope: "checkoutAction",
    key: buildSecurityKey(
      getClientIp(requestHeaders),
      guestKey,
      user?.id,
      customerEmail?.toLowerCase(),
      customerPhone,
      paymentMethod,
    ),
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  const cart = await getOrCreateCart(guestKey, user?.id);
  const summary = getCartSummary(cart);
  const resolvedSummary = await summary;

  if (!resolvedSummary.items.length) {
    throw new Error("Your cart is empty");
  }

  if (wantsBkash && !getBkashIntegrationConfig().enabled) {
    throw new Error("bKash checkout is temporarily unavailable");
  }

  const order = await createOrderFromCart({
    cart,
    customerName,
    customerPhone,
    customerEmail,
    district,
    shippingAddress,
    notes,
    paymentProvider: paymentMethod,
    couponCode,
  });

  if (!wantsBkash) {
    revalidatePath("/cart");
    revalidatePath("/checkout");
    revalidatePath("/admin");
    redirect(`/track-order?code=${order.orderCode}`);
  }

  const providerReady = await initiateBkashPayment({
    orderId: order.id,
    amount: order.total,
    customerName,
    customerPhone,
  });

  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/admin");
  redirect(providerReady.redirectUrl);
}
