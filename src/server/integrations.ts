import crypto from "crypto";
import {
  addPaymentLog,
  listPayments,
  updateOrderDelivery,
  updateOrderPayment,
  updateShipmentStatus,
  upsertPayment,
  upsertShipment,
} from "@/server/store";
import type { PaymentProviderKey } from "@/lib/domain";

export interface PaymentInitiationResult {
  provider: PaymentProviderKey;
  paymentId: string;
  redirectUrl: string;
  rawResponse: Record<string, unknown>;
}

export interface CourierCreationResult {
  courierKey: "pathao" | "steadfast";
  shipmentId: string;
  trackingId: string;
  consignmentId?: string;
  rawResponse: Record<string, unknown>;
}

export function verifyProviderSignature(body: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const received = Buffer.from(signature);
  const computed = Buffer.from(expected);
  if (received.length !== computed.length) return false;
  return crypto.timingSafeEqual(received, computed);
}

export async function initiateBkashPayment(args: {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
}) {
  const payment = upsertPayment({
    orderId: args.orderId,
    provider: "bkash",
    transactionId: `BK-${Date.now()}`,
    amount: args.amount,
    status: "processing",
    rawResponse: {
      provider: "bkash",
      merchant: process.env.BKASH_USERNAME || "demo",
      action: "initiate",
    },
  });

  addPaymentLog(payment.id, "init", { provider: "bkash", ...args });
  updateOrderPayment(args.orderId, { paymentStatus: "processing", paymentProvider: "bkash" });

  return {
    provider: "bkash",
    paymentId: payment.id,
    redirectUrl: `/payments/bkash/simulate?paymentId=${payment.id}`,
    rawResponse: payment.rawResponse,
  } satisfies PaymentInitiationResult;
}

export async function initiateNagadPayment(args: {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
}) {
  const payment = upsertPayment({
    orderId: args.orderId,
    provider: "nagad",
    transactionId: `NG-${Date.now()}`,
    amount: args.amount,
    status: "processing",
    rawResponse: {
      provider: "nagad",
      merchant: process.env.NAGAD_MERCHANT_ID || "demo",
      action: "initiate",
    },
  });

  addPaymentLog(payment.id, "init", { provider: "nagad", ...args });
  updateOrderPayment(args.orderId, { paymentStatus: "processing", paymentProvider: "nagad" });

  return {
    provider: "nagad",
    paymentId: payment.id,
    redirectUrl: `/payments/nagad/simulate?paymentId=${payment.id}`,
    rawResponse: payment.rawResponse,
  } satisfies PaymentInitiationResult;
}

export async function confirmPayment(paymentId: string, status: "paid" | "failed" | "cancelled" | "refunded", verificationPayload: Record<string, unknown>) {
  const payment = listPayments().find((item) => item.id === paymentId);
  if (!payment) return null;
  payment.status = status;
  payment.rawResponse = { ...payment.rawResponse, verificationPayload };
  payment.updatedAt = new Date().toISOString();
  addPaymentLog(payment.id, "verification", verificationPayload);
  updateOrderPayment(payment.orderId, { paymentStatus: status, paymentProvider: payment.provider });
  return payment;
}

export async function createPathaoShipment(args: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
}) {
  const trackingId = `PT-${Date.now().toString().slice(-6)}`;
  const shipment = upsertShipment({
    orderId: args.orderId,
    courierKey: "pathao",
    trackingId,
    consignmentId: `PATHAO-${Date.now()}`,
    customerName: args.customerName,
    customerPhone: args.customerPhone,
    customerAddress: args.customerAddress,
    status: "courier_created",
    rawResponse: { provider: "pathao", action: "create" },
  });
  updateOrderDelivery(args.orderId, "courier_created");
  return {
    courierKey: "pathao",
    shipmentId: shipment.id,
    trackingId,
    consignmentId: shipment.consignmentId,
    rawResponse: shipment.rawResponse,
  } satisfies CourierCreationResult;
}

export async function createSteadfastShipment(args: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
}) {
  const trackingId = `SF-${Date.now().toString().slice(-6)}`;
  const shipment = upsertShipment({
    orderId: args.orderId,
    courierKey: "steadfast",
    trackingId,
    consignmentId: `STEADFAST-${Date.now()}`,
    customerName: args.customerName,
    customerPhone: args.customerPhone,
    customerAddress: args.customerAddress,
    status: "courier_created",
    rawResponse: { provider: "steadfast", action: "create" },
  });
  updateOrderDelivery(args.orderId, "courier_created");
  return {
    courierKey: "steadfast",
    shipmentId: shipment.id,
    trackingId,
    consignmentId: shipment.consignmentId,
    rawResponse: shipment.rawResponse,
  } satisfies CourierCreationResult;
}

export function syncCourierStatus(shipmentId: string, status: "picked_up" | "in_transit" | "delivered" | "returned" | "cancelled") {
  return updateShipmentStatus(shipmentId, status);
}
