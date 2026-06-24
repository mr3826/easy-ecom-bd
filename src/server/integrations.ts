import crypto from "crypto";
import {
  addPaymentLog,
  getPaymentById,
  getPaymentByTransactionId,
  getShipmentByConsignmentId,
  getShipmentById,
  getShipmentByTrackingId,
  updateOrderDelivery,
  updateOrderPayment,
  updateShipmentStatus,
  upsertPayment,
  upsertShipment,
} from "@/server/store";
import type { DeliveryStatus, PaymentProviderKey } from "@/lib/domain";
import {
  getBkashIntegrationConfig,
  getPathaoIntegrationConfig,
  getSteadfastIntegrationConfig,
} from "@/server/integration-config";

export interface PaymentInitiationResult {
  provider: PaymentProviderKey;
  paymentId: string;
  redirectUrl: string;
  rawResponse: Record<string, unknown>;
}

export interface CourierCreationResult {
  courierKey: "pathao" | "steadfast" | "redx";
  shipmentId: string;
  trackingId: string;
  consignmentId?: string;
  rawResponse: Record<string, unknown>;
}

type PaymentLookup = {
  paymentId?: string | null;
  transactionId?: string | null;
};

type CourierLookup = {
  shipmentId?: string | null;
  trackingId?: string | null;
  consignmentId?: string | null;
};

function pickString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function buildCallbackUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
  return new URL(path, baseUrl).toString();
}

async function postJson(url: string, body: Record<string, unknown>, headers: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let parsed: unknown = rawText;
  try {
    parsed = rawText ? JSON.parse(rawText) : {};
  } catch {
    parsed = { rawText };
  }

  if (!response.ok) {
    throw new Error(`Provider request failed (${response.status}): ${rawText.slice(0, 200)}`);
  }

  return isPlainObject(parsed) ? parsed : { rawText };
}

export function verifyProviderSignature(body: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const received = Buffer.from(signature);
  const computed = Buffer.from(expected);
  if (received.length !== computed.length) return false;
  return crypto.timingSafeEqual(received, computed);
}

async function findPayment(reference: PaymentLookup) {
  if (reference.paymentId) {
    const byId = await getPaymentById(reference.paymentId);
    if (byId) return byId;
  }
  if (reference.transactionId) {
    const byTransaction = await getPaymentByTransactionId(reference.transactionId);
    if (byTransaction) return byTransaction;
  }
  return null;
}

async function findShipment(reference: CourierLookup) {
  if (reference.shipmentId) {
    const byId = await getShipmentById(reference.shipmentId);
    if (byId) return byId;
  }
  if (reference.trackingId) {
    const byTracking = await getShipmentByTrackingId(reference.trackingId);
    if (byTracking) return byTracking;
  }
  if (reference.consignmentId) {
    const byConsignment = await getShipmentByConsignmentId(reference.consignmentId);
    if (byConsignment) return byConsignment;
  }
  return null;
}

export async function initiateBkashPayment(args: {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
}) {
  const config = getBkashIntegrationConfig();
  const payment = await upsertPayment({
    orderId: args.orderId,
    provider: "bkash",
    transactionId: `BK-${Date.now()}`,
    amount: args.amount,
    status: "processing",
    rawResponse: {
      provider: "bkash",
      mode: config.enabled ? "live" : "local",
      action: "initiate",
    },
  });

  await addPaymentLog(payment.id, "init", { provider: "bkash", ...args, mode: config.enabled ? "live" : "local" });
  await updateOrderPayment(args.orderId, { paymentStatus: "processing", paymentProvider: "bkash" });

  if (!config.enabled) {
    return {
      provider: "bkash",
      paymentId: payment.id,
      redirectUrl: `/payments/bkash/simulate?paymentId=${payment.id}`,
      rawResponse: payment.rawResponse,
    } satisfies PaymentInitiationResult;
  }

  const callbackUrl = buildCallbackUrl("/api/payments/bkash/callback");
  const response = await postJson(
    new URL(config.createPaymentPath, config.baseUrl).toString(),
    {
      amount: args.amount,
      orderId: args.orderId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      callbackUrl,
      username: config.username,
      appKey: config.appKey,
    },
    {
      Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`,
      "X-APP-Key": config.appKey,
      "X-APP-Secret": config.appSecret,
    },
  );

  const transactionId = pickString(response, ["paymentID", "paymentId", "transactionId", "trxId"]) || payment.transactionId;
  const redirectUrl =
    pickString(response, ["paymentURL", "paymentUrl", "bkashUrl", "redirectUrl"]) ||
    `/payments/bkash/simulate?paymentId=${payment.id}`;

  const updated = await upsertPayment({
    id: payment.id,
    orderId: args.orderId,
    provider: "bkash",
    transactionId,
    amount: args.amount,
    status: "processing",
    rawResponse: response as Record<string, unknown>,
  });

  await addPaymentLog(updated.id, "init", {
    provider: "bkash",
    mode: "live",
    callbackUrl,
    response,
  });

  return {
    provider: "bkash",
    paymentId: updated.id,
    redirectUrl,
    rawResponse: response as Record<string, unknown>,
  } satisfies PaymentInitiationResult;
}

export async function initiateNagadPayment(args: {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
}) {
  const payment = await upsertPayment({
    orderId: args.orderId,
    provider: "nagad",
    transactionId: `NG-${Date.now()}`,
    amount: args.amount,
    status: "processing",
    rawResponse: {
      provider: "nagad",
      action: "initiate",
      mode: "local",
    },
  });

  await addPaymentLog(payment.id, "init", { provider: "nagad", ...args });
  await updateOrderPayment(args.orderId, { paymentStatus: "processing", paymentProvider: "nagad" });

  return {
    provider: "nagad",
    paymentId: payment.id,
    redirectUrl: `/payments/nagad/simulate?paymentId=${payment.id}`,
    rawResponse: payment.rawResponse,
  } satisfies PaymentInitiationResult;
}

export async function confirmPayment(
  reference: string | PaymentLookup,
  status: "paid" | "failed" | "cancelled" | "refunded",
  verificationPayload: Record<string, unknown>,
) {
  const lookup = typeof reference === "string" ? { paymentId: reference } : reference;
  const payment = await findPayment(lookup);
  if (!payment) return null;

  const updated = await upsertPayment({
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    transactionId: payment.transactionId,
    amount: payment.amount,
    status,
    rawResponse: { ...(payment.rawResponse as Record<string, unknown>), verificationPayload },
  });
  await addPaymentLog(updated.id, "verification", verificationPayload);
  await updateOrderPayment(updated.orderId, { paymentStatus: status, paymentProvider: updated.provider });
  return updated;
}

async function createCourierShipment(args: {
  courierKey: "pathao" | "steadfast" | "redx";
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  district?: string;
  actor?: Parameters<typeof updateOrderDelivery>[2];
}) {
  const config =
    args.courierKey === "pathao"
      ? getPathaoIntegrationConfig()
      : args.courierKey === "steadfast"
        ? getSteadfastIntegrationConfig()
        : null;
  const prefix = args.courierKey === "pathao" ? "PT" : args.courierKey === "steadfast" ? "SF" : "RX";
  const providerCode = args.courierKey === "pathao" ? "PATHAO" : args.courierKey === "steadfast" ? "STEADFAST" : "REDX";
  const trackingId = `${prefix}-${Date.now().toString().slice(-6)}`;
  const consignmentId = `${providerCode}-${Date.now()}`;

  const localShipment = await upsertShipment({
    orderId: args.orderId,
    courierKey: args.courierKey,
    trackingId,
    consignmentId,
    customerName: args.customerName,
    customerPhone: args.customerPhone,
    customerAddress: args.customerAddress,
    status: "courier_created",
    rawResponse: {
      provider: args.courierKey,
      mode: config?.enabled ? "live" : "local",
      action: "create",
    },
  });

  await updateOrderDelivery(args.orderId, "courier_created", args.actor);

  if (!config?.enabled) {
    return {
      courierKey: args.courierKey,
      shipmentId: localShipment.id,
      trackingId,
      consignmentId,
      rawResponse: localShipment.rawResponse,
    } satisfies CourierCreationResult;
  }

  const response = await postJson(
    new URL(config.createShipmentPath, config.baseUrl).toString(),
    {
      orderId: args.orderId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerAddress: args.customerAddress,
      district: args.district,
      trackingId,
      consignmentId,
      username: config.username,
      clientId: config.clientId,
    },
    {
      Authorization: `Basic ${Buffer.from(`${config.username || config.clientId}:${config.password || config.clientSecret}`).toString("base64")}`,
      "X-Client-Id": config.clientId,
      "X-Client-Secret": config.clientSecret,
    },
  );

  const createdTrackingId = pickString(response, ["trackingId", "trackingID", "consignmentId", "shipmentId"]) || trackingId;
  const createdConsignmentId = pickString(response, ["consignmentId", "consignmentID", "trackingNumber"]) || consignmentId;

  const updatedShipment = await upsertShipment({
    id: localShipment.id,
    orderId: args.orderId,
    courierKey: args.courierKey,
    trackingId: createdTrackingId,
    consignmentId: createdConsignmentId,
    customerName: args.customerName,
    customerPhone: args.customerPhone,
    customerAddress: args.customerAddress,
    status: "courier_created",
    rawResponse: response as Record<string, unknown>,
  });

  return {
    courierKey: args.courierKey,
    shipmentId: updatedShipment.id,
    trackingId: createdTrackingId,
    consignmentId: createdConsignmentId,
    rawResponse: response as Record<string, unknown>,
  } satisfies CourierCreationResult;
}

export async function createRedxShipment(args: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  district?: string;
  actor?: Parameters<typeof updateOrderDelivery>[2];
}) {
  return createCourierShipment({
    courierKey: "redx",
    ...args,
  });
}

export async function createPathaoShipment(args: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  district?: string;
  actor?: Parameters<typeof updateOrderDelivery>[2];
}) {
  return createCourierShipment({
    courierKey: "pathao",
    ...args,
  });
}

export async function createSteadfastShipment(args: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  district?: string;
  actor?: Parameters<typeof updateOrderDelivery>[2];
}) {
  return createCourierShipment({
    courierKey: "steadfast",
    ...args,
  });
}

export async function syncCourierStatus(
  shipmentId: string,
  status: "picked_up" | "in_transit" | "delivered" | "returned" | "cancelled",
  actor?: Parameters<typeof updateShipmentStatus>[2],
) {
  return updateShipmentStatus(shipmentId, status, actor);
}

export async function syncCourierStatusByReference(
  reference: CourierLookup,
  status: DeliveryStatus,
  actor?: Parameters<typeof updateShipmentStatus>[2],
) {
  const shipment = await findShipment(reference);
  if (!shipment) return null;
  return updateShipmentStatus(shipment.id, status, actor);
}
