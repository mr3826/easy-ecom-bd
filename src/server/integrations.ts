import crypto from "crypto";
import { getPrisma } from "@/server/db";
import {
  addPaymentLog,
  getPaymentById,
  getPaymentByTransactionId,
  updateOrderPayment,
  upsertPayment,
} from "@/server/store";
import type { PaymentProviderKey, PaymentStatus } from "@/lib/domain";
import { getBkashIntegrationConfig } from "@/server/integration-config";
import { buildPaymentCallbackFingerprint } from "@/server/security";
import { getSiteOrigin } from "@/lib/site-url";

export { buildPaymentCallbackFingerprint } from "@/server/security";

export interface PaymentInitiationResult {
  provider: PaymentProviderKey;
  paymentId: string;
  redirectUrl: string;
  rawResponse: Record<string, unknown>;
}

type PaymentLookup = {
  paymentId?: string | null;
  transactionId?: string | null;
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
  return new URL(path, getSiteOrigin()).toString();
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

function getVerificationState(rawResponse: unknown) {
  if (!rawResponse || typeof rawResponse !== "object" || Array.isArray(rawResponse)) {
    return null;
  }

  const verificationState = (rawResponse as Record<string, unknown>).verificationState;
  if (!verificationState || typeof verificationState !== "object" || Array.isArray(verificationState)) {
    return null;
  }

  const fingerprint = (verificationState as Record<string, unknown>).fingerprint;
  if (typeof fingerprint !== "string" || !fingerprint.trim()) {
    return null;
  }

  return {
    fingerprint,
  };
}

export async function initiateBkashPayment(args: {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
}) {
  const config = getBkashIntegrationConfig();
  if (!config.enabled) {
    throw new Error("bKash checkout is not configured");
  }

  const payment = await upsertPayment({
    orderId: args.orderId,
    provider: "bkash",
    transactionId: `BK-${Date.now()}`,
    amount: args.amount,
    status: "processing",
    rawResponse: {
      provider: "bkash",
      mode: "live",
      action: "initiate",
    },
  });

  await addPaymentLog(payment.id, "init", { provider: "bkash", ...args, mode: "live" });
  await updateOrderPayment(args.orderId, { paymentStatus: "processing", paymentProvider: "bkash" });

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
  const redirectUrl = pickString(response, ["paymentURL", "paymentUrl", "bkashUrl", "redirectUrl"]);
  if (!redirectUrl) {
    throw new Error("bKash did not return a checkout URL");
  }

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

export async function confirmPayment(
  reference: string | PaymentLookup,
  status: PaymentStatus,
  verificationPayload: Record<string, unknown>,
) {
  const lookup = typeof reference === "string" ? { paymentId: reference } : reference;
  const payment = await findPayment(lookup);
  if (!payment) return null;

  const fingerprint = buildPaymentCallbackFingerprint(payment, status, verificationPayload);
  const verificationState = getVerificationState(payment.rawResponse);
  if (verificationState?.fingerprint === fingerprint) {
    return payment;
  }

  /*
  H6. These three writes used to run on three separate connections and commit
  independently. A failure after the first left the payment row reading `paid`
  while its order still read `pending` — the gateway had taken the money and
  nothing downstream knew. A failure after the second additionally left a
  verification log for a state the order never reached.

  They are one transaction now. Each store function takes the same optional
  `client` that recordAuditLog already took, so this passes `tx` down rather
  than reimplementing their bodies — updateOrderPayment in particular also
  releases inventory and writes an audit row, and a copy here would drift from
  the original the first time either changed.
  */
  return getPrisma().$transaction(async (tx) => {
    const updated = await upsertPayment(
      {
        id: payment.id,
        orderId: payment.orderId,
        provider: payment.provider,
        transactionId: payment.transactionId,
        amount: payment.amount,
        status,
        rawResponse: {
          ...(payment.rawResponse as Record<string, unknown>),
          verificationPayload,
          verificationState: {
            fingerprint,
            status,
            confirmedAt: new Date().toISOString(),
          },
        },
      },
      undefined,
      tx,
    );
    await addPaymentLog(updated.id, "verification", verificationPayload, tx);
    await updateOrderPayment(
      updated.orderId,
      { paymentStatus: status, paymentProvider: updated.provider },
      undefined,
      tx,
    );
    return updated;
  });
}
