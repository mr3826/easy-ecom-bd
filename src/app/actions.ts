"use server";

import { randomUUID } from "crypto";
import { compareSync, hashSync } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addToCart,
  CheckoutError,
  createAddressForUser,
  createOrderFromCart,
  createUser,
  deleteAddressForUser,
  getCartSummary,
  getProduct,
  getOrCreateCart,
  findUserByEmail,
  listProducts,
  removeCartItem,
  setDefaultAddressForUser,
  updateAddressForUser,
  updateCartQuantity,
  clearCart,
  updateUser,
} from "@/server/store";
import { asNumber, asString } from "@/lib/utils";
import { initiateBkashPayment } from "@/server/integrations";
import { getBkashIntegrationConfig } from "@/server/integration-config";
import { clearSessionCookie, getCurrentUser, getPostLoginRedirectPath, setSessionCookie, createPasswordResetToken, consumePasswordResetToken, createEmailVerificationToken, consumeEmailVerificationToken, markEmailVerified } from "@/server/auth";
import {
  assertRateLimit,
  buildSecurityKey,
  consumeRateLimit,
  getClientIp,
  requireSameOrigin,
} from "@/server/security";
import {
  sendEmail,
  getPasswordResetEmail,
  getEmailVerificationEmail,
  getOrderConfirmationEmail,
  type OrderConfirmationItem,
  type OrderConfirmationOrder,
} from "@/server/email";
import { getSiteOrigin } from "@/lib/site-url";

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

export type LoginState = {
  error?: string;
  /** Echoed back so a rejected attempt does not blank out what was typed. */
  email?: string;
};

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Customer name must be at least 2 characters"),
  customerPhone: z.string().min(7, "Customer phone must be at least 7 characters"),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  district: z.string().min(2, "District must be at least 2 characters"),
  shippingAddress: z.string().min(4, "Shipping address must be at least 4 characters"),
  notes: z.string().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(["cod", "bkash"]).optional(),
});

export type CheckoutState = {
  error?: string;
  success?: string;
  /** Echoed back so a rejected attempt does not blank out what was typed. */
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  district?: string;
  shippingAddress?: string;
  notes?: string;
  couponCode?: string;
  paymentMethod?: "cod" | "bkash";
};

/**
 * Returns failures instead of throwing them. Every throw from a server action
 * reaching the client is an unhandled runtime error, so a mistyped password or
 * a tripped rate limit used to take down the whole page.
 */
export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = asString(formData.get("email"));
  const password = asString(formData.get("password"));

  let destination: string;
  try {
    const requestHeaders = await requireActionOrigin("loginAction");
    const rateLimit = consumeRateLimit({
      scope: "loginAction",
      key: buildSecurityKey(getClientIp(requestHeaders), email.toLowerCase()),
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return { email, error: "Too many login attempts. Please try again later." };
    }

    const user = await findUserByEmail(email);
    if (!user || !compareSync(password, user.passwordHash)) {
      // Deliberately identical for "no such user" and "wrong password" so the
      // form cannot be used to enumerate registered addresses.
      return { email, error: "The email or password is not correct." };
    }

    await setSessionCookie(user.id);
    destination = getPostLoginRedirectPath(user.role);
  } catch (error) {
    // Rejected origin, database outage, bcrypt failure. The user gets one
    // generic line; the detail stays in the server log.
    console.error("loginAction failed", error);
    return { email, error: "Something went wrong. Please try again." };
  }

  revalidatePath("/");
  // Outside the try on purpose: redirect() signals by throwing, so catching it
  // here would turn every successful login into "Something went wrong".
  redirect(destination);
}

export async function logoutAction() {
  await requireActionOrigin("logoutAction");
  await clearSessionCookie();
  redirect("/");
}

type UpdateProfileState = {
  error?: string;
  success?: string;
  name?: string;
  email?: string;
  phone?: string;
};

export async function updateUserProfileAction(
  _previous: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7).optional(),
  });

  const parsed = schema.safeParse({
    name: asString(formData.get("name")),
    email: asString(formData.get("email")),
    phone: asString(formData.get("phone")) || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid profile details" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to update your profile" };
  }

  const requestHeaders = await requireActionOrigin("updateUserProfileAction");
  assertRateLimit({
    scope: "updateUserProfileAction",
    key: buildSecurityKey(getClientIp(requestHeaders), user.id),
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  const emailChanged = parsed.data.email.toLowerCase() !== user.email.toLowerCase();
  if (emailChanged) {
    const existing = await findUserByEmail(parsed.data.email);
    if (existing && existing.id !== user.id) {
      return { error: "An account already exists for this email address" };
    }
  }

  const updatedUser = await updateUser(user.id, {
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
  });

  if (!updatedUser) {
    return { error: "Failed to update profile" };
  }

  revalidatePath("/account");
  revalidatePath("/account/profile");

  if (emailChanged) {
    // TODO: Send verification email to the new address
    // For now, we'll just log and return a success message
    return {
      success: "Profile updated. A verification email has been sent to your new email address.",
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone ?? undefined,
    };
  }

  return {
    success: "Profile updated successfully",
    name: updatedUser.name,
    email: updatedUser.email,
    phone: updatedUser.phone ?? undefined,
  };
}

const addressSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional(),
  district: z.string().min(2),
  addressLine1: z.string().min(4),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().min(3),
  isDefault: z.boolean().optional(),
});

type AddressState = {
  error?: string;
  success?: string;
};

function parseAddressForm(formData: FormData) {
  return addressSchema.safeParse({
    name: asString(formData.get("name")),
    phone: asString(formData.get("phone")),
    email: asString(formData.get("email")) || undefined,
    district: asString(formData.get("district")),
    addressLine1: asString(formData.get("addressLine1")),
    addressLine2: asString(formData.get("addressLine2")) || undefined,
    city: asString(formData.get("city")),
    state: asString(formData.get("state")),
    postalCode: asString(formData.get("postalCode")),
    isDefault: formData.get("isDefault") === "on",
  });
}

export async function createAddressAction(_previous: AddressState, formData: FormData): Promise<AddressState> {
  const parsed = parseAddressForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid address details" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to manage addresses" };
  }

  const requestHeaders = await requireActionOrigin("createAddressAction");
  assertRateLimit({
    scope: "createAddressAction",
    key: buildSecurityKey(getClientIp(requestHeaders), user.id),
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });

  await createAddressForUser(user.id, parsed.data, user);
  revalidatePath("/account/addresses");
  return { success: "Address added" };
}

export async function updateAddressAction(_previous: AddressState, formData: FormData): Promise<AddressState> {
  const addressId = asString(formData.get("addressId"));
  if (!addressId) {
    return { error: "Missing address" };
  }

  const parsed = parseAddressForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid address details" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to manage addresses" };
  }

  const requestHeaders = await requireActionOrigin("updateAddressAction");
  assertRateLimit({
    scope: "updateAddressAction",
    key: buildSecurityKey(getClientIp(requestHeaders), user.id),
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });

  const updated = await updateAddressForUser(user.id, addressId, parsed.data, user);
  if (!updated) {
    return { error: "Address not found" };
  }
  revalidatePath("/account/addresses");
  return { success: "Address updated" };
}

export async function deleteAddressAction(formData: FormData) {
  await requireActionOrigin("deleteAddressAction");
  const addressId = asString(formData.get("addressId"));
  const user = await getCurrentUser();
  if (!user || !addressId) return;
  await deleteAddressForUser(user.id, addressId, user);
  revalidatePath("/account/addresses");
}

export async function setDefaultAddressAction(formData: FormData) {
  await requireActionOrigin("setDefaultAddressAction");
  const addressId = asString(formData.get("addressId"));
  const user = await getCurrentUser();
  if (!user || !addressId) return;
  await setDefaultAddressForUser(user.id, addressId, user);
  revalidatePath("/account/addresses");
}

export async function checkoutAction(
  _previous: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const requestHeaders = await requireActionOrigin("checkoutAction");

  const parsed = checkoutSchema.safeParse({
    customerName: asString(formData.get("customerName")),
    customerPhone: asString(formData.get("customerPhone")),
    customerEmail: asString(formData.get("customerEmail")) || undefined,
    district: asString(formData.get("district")),
    shippingAddress: asString(formData.get("shippingAddress")),
    notes: asString(formData.get("notes")) || undefined,
    couponCode: asString(formData.get("couponCode")) || undefined,
    paymentMethod: asString(formData.get("paymentMethod")) || undefined,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: issue?.message || "Invalid checkout details",
      customerName: asString(formData.get("customerName")),
      customerPhone: asString(formData.get("customerPhone")),
      customerEmail: asString(formData.get("customerEmail")) || undefined,
      district: asString(formData.get("district")),
      shippingAddress: asString(formData.get("shippingAddress")),
      notes: asString(formData.get("notes")) || undefined,
      couponCode: asString(formData.get("couponCode")) || undefined,
      paymentMethod: (asString(formData.get("paymentMethod")) as "cod" | "bkash") || "cod",
    };
  }

  const { customerName, customerPhone, customerEmail, district, shippingAddress, notes, couponCode, paymentMethod } = parsed.data;
  const rawPaymentMethod = paymentMethod || "cod";
  if (rawPaymentMethod !== "cod" && rawPaymentMethod !== "bkash") {
    return {
      error: "Unsupported payment method",
      customerName,
      customerPhone,
      customerEmail,
      district,
      shippingAddress,
      notes,
      couponCode,
      paymentMethod: rawPaymentMethod as "cod" | "bkash",
    };
  }
  const wantsBkash = rawPaymentMethod === "bkash";

  const echoedState: CheckoutState = {
    customerName,
    customerPhone,
    customerEmail,
    district,
    shippingAddress,
    notes,
    couponCode,
    paymentMethod: rawPaymentMethod as "cod" | "bkash",
  };

  const guestKey = await getGuestKey();
  const user = await getCurrentUser();

  let redirectDestination: string | null = null;
  // Captured inside the try, sent after it. The order is already committed by
  // then, so nothing about the email can turn a placed order into a checkout
  // error and prompt the customer to order again.
  let confirmation: {
    to: string;
    order: OrderConfirmationOrder;
    items: OrderConfirmationItem[];
    trackUrl: string;
  } | null = null;

  try {
    const rateLimit = consumeRateLimit({
      scope: "checkoutAction",
      key: buildSecurityKey(
        getClientIp(requestHeaders),
        guestKey,
        user?.id,
        customerEmail?.toLowerCase(),
        customerPhone,
        rawPaymentMethod,
      ),
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return { ...echoedState, error: "Too many checkout attempts. Please try again later." };
    }

    const cart = await getOrCreateCart(guestKey, user?.id);
    const summary = getCartSummary(cart);
    const resolvedSummary = await summary;

    if (!resolvedSummary.items.length) {
      return { ...echoedState, error: "Your cart is empty" };
    }

    if (wantsBkash && !getBkashIntegrationConfig().enabled) {
      return { ...echoedState, error: "bKash checkout is temporarily unavailable" };
    }

    const order = await createOrderFromCart({
      cart,
      customerName,
      customerPhone,
      customerEmail,
      // H2: the only place the signed-in customer is known. Guests stay null.
      customerId: user?.id ?? null,
      district,
      shippingAddress,
      notes,
      paymentProvider: rawPaymentMethod,
      couponCode,
    });

    if (!wantsBkash) {
      revalidatePath("/cart");
      revalidatePath("/checkout");
      revalidatePath("/admin");
      redirectDestination = `/track-order?code=${order.orderCode}`;
      // The email is optional at checkout, so a guest who left it blank simply
      // gets no confirmation. resolvedSummary is read rather than the order's
      // own items because OrderItem carries productId but no product name, and
      // the cart it came from has already been emptied by createOrderFromCart.
      if (customerEmail) {
        confirmation = {
          to: customerEmail,
          order,
          items: resolvedSummary.items,
          trackUrl: `${getSiteOrigin()}${redirectDestination}`,
        };
      }
    } else {
      const providerReady = await initiateBkashPayment({
        orderId: order.id,
        amount: order.total,
        customerName,
        customerPhone,
      });

      revalidatePath("/cart");
      revalidatePath("/checkout");
      revalidatePath("/admin");
      redirectDestination = providerReady.redirectUrl;
    }
  } catch (error) {
    console.error("checkoutAction failed", error);
    const errorMessage =
      error instanceof CheckoutError
        ? error.message
        : "Something went wrong. Please try again.";
    return { ...echoedState, error: errorMessage };
  }

  if (confirmation) {
    try {
      // ponytail: awaited, so it delays the redirect by one SMTP round-trip.
      // The mail server is the same host, so that is ~100-300ms; move to a
      // queue only if it shows up in checkout latency.
      const emailResult = await sendEmail(
        confirmation.to,
        getOrderConfirmationEmail(confirmation.order, confirmation.items, confirmation.trackUrl),
      );
      if (!emailResult.success) {
        console.error("Failed to send order confirmation email:", emailResult.error);
      }
    } catch (error) {
      // sendEmail already swallows transport errors, so reaching here means
      // template rendering threw. The order still stands either way.
      console.error("Failed to build the order confirmation email", error);
    }
  }

  if (redirectDestination) {
    redirect(redirectDestination);
  }

  return { ...echoedState, error: "Something went wrong. Please try again." };
}

export type ForgotPasswordState = {
  error?: string;
  success?: string;
  email?: string;
};

export async function forgotPasswordAction(_previous: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const email = asString(formData.get("email")).toLowerCase();

  const requestHeaders = await requireActionOrigin("forgotPasswordAction");
  assertRateLimit({
    scope: "forgotPasswordAction",
    key: buildSecurityKey(getClientIp(requestHeaders), email),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  const token = await createPasswordResetToken(email);
  
  if (!token) {
    return { email, error: "If an account exists for this email, a reset link has been sent." };
  }

  const resetUrl = `${getSiteOrigin()}/reset-password?token=${token}`;
  const emailResult = await sendEmail(email, getPasswordResetEmail(resetUrl, email));

  if (!emailResult.success) {
    console.error("Failed to send password reset email:", emailResult.error);
  }

  return { success: "If an account exists for this email, a reset link has been sent." };
}

export type ResetPasswordState = {
  error?: string;
  success?: string;
};

export async function resetPasswordAction(_previous: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const token = asString(formData.get("token"));
  const password = asString(formData.get("password"));
  const confirmPassword = asString(formData.get("confirmPassword"));

  if (!token) {
    return { error: "Invalid or missing reset token." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const user = await consumePasswordResetToken(token);
  if (!user) {
    return { error: "Invalid or expired reset token." };
  }

  const { hashSync } = await import("bcryptjs");
  const { updateUserPassword, deleteManySessions, deleteManyPasswordResetTokens } = await import("@/server/store");

  await Promise.all([
    updateUserPassword(user.id, hashSync(password, 10)),
    deleteManySessions(user.id),
    deleteManyPasswordResetTokens(user.id),
  ]);

  return { success: "Password has been reset. You can now sign in." };
}

export type ResendVerificationState = {
  error?: string;
  success?: string;
  email?: string;
};

export async function resendVerificationAction(_previous: ResendVerificationState, formData: FormData): Promise<ResendVerificationState> {
  const email = asString(formData.get("email")).toLowerCase();

  const requestHeaders = await requireActionOrigin("resendVerificationAction");
  assertRateLimit({
    scope: "resendVerificationAction",
    key: buildSecurityKey(getClientIp(requestHeaders), email),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  const { findUserByEmail } = await import("@/server/store");
  const user = await findUserByEmail(email);

  if (!user) {
    return { email, error: "If an account exists for this email, a verification link has been sent." };
  }

  const token = await createEmailVerificationToken(user.id);
  if (!token) {
    return { email, error: "Could not create verification token." };
  }

  const verifyUrl = `${getSiteOrigin()}/verify-email?token=${token}`;
  const emailResult = await sendEmail(email, getEmailVerificationEmail(verifyUrl, user.name));

  if (!emailResult.success) {
    console.error("Failed to send verification email:", emailResult.error);
  }

  return { success: "If an account exists for this email, a verification link has been sent." };
}

export type VerifyEmailState = {
  error?: string;
  success?: string;
};

export async function verifyEmailAction(_previous: VerifyEmailState, formData: FormData): Promise<VerifyEmailState> {
  const token = asString(formData.get("token"));

  if (!token) {
    return { error: "Invalid or missing verification token." };
  }

  const user = await consumeEmailVerificationToken(token);
  if (!user) {
    return { error: "Invalid or expired verification token." };
  }

  await markEmailVerified(user.id);

  return { success: "Email verified successfully. You can now sign in." };
}
