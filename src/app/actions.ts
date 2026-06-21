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
  getOrCreateCart,
  findUserByEmail,
  removeCartItem,
  updateCartQuantity,
} from "@/server/store";
import { asNumber, asString } from "@/lib/utils";
import { initiateBkashPayment, initiateNagadPayment } from "@/server/integrations";
import { clearSessionCookie, getCurrentUser, setSessionCookie } from "@/server/auth";

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

export async function addToCartAction(formData: FormData) {
  const productId = asString(formData.get("productId"));
  const quantity = asNumber(formData.get("quantity"), 1);
  const user = await getCurrentUser();
  const guestKey = await getGuestKey();
  addToCart(guestKey, productId, quantity, user?.id);
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function updateCartQuantityAction(formData: FormData) {
  const productId = asString(formData.get("productId"));
  const quantity = asNumber(formData.get("quantity"), 1);
  const guestKey = await getGuestKey();
  const user = await getCurrentUser();
  updateCartQuantity(guestKey, productId, quantity, user?.id);
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function removeCartItemAction(formData: FormData) {
  const productId = asString(formData.get("productId"));
  const guestKey = await getGuestKey();
  const user = await getCurrentUser();
  removeCartItem(guestKey, productId, user?.id);
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

  const existing = findUserByEmail(parsed.data.email);
  if (existing) {
    throw new Error("An account already exists for this email address");
  }

  const user = createUser({
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
  const user = findUserByEmail(email);

  if (!user || !compareSync(password, user.passwordHash)) {
    throw new Error("The email or password is not correct");
  }

  await setSessionCookie(user.id);
  revalidatePath("/");
  redirect(user.role === "admin" ? "/admin" : "/account");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}

export async function checkoutAction(formData: FormData) {
  const paymentProvider = asString(formData.get("paymentProvider")) as "bkash" | "nagad";
  const customerName = asString(formData.get("customerName"));
  const customerPhone = asString(formData.get("customerPhone"));
  const customerEmail = asString(formData.get("customerEmail")) || undefined;
  const shippingAddress = asString(formData.get("shippingAddress"));
  const notes = asString(formData.get("notes")) || undefined;
  const couponCode = asString(formData.get("couponCode")) || undefined;
  const guestKey = await getGuestKey();
  const user = await getCurrentUser();
  const cart = getOrCreateCart(guestKey, user?.id);
  const summary = getCartSummary(cart);

  if (!summary.items.length) {
    throw new Error("Your cart is empty");
  }

  const order = createOrderFromCart({
    cart,
    customerName,
    customerPhone,
    customerEmail,
    shippingAddress,
    notes,
    paymentProvider,
    couponCode,
  });

  const providerReady =
    paymentProvider === "bkash"
      ? await initiateBkashPayment({
          orderId: order.id,
          amount: order.total,
          customerName,
          customerPhone,
        })
      : await initiateNagadPayment({
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
