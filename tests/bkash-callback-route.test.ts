import crypto from "node:crypto";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { Payment } from "@/lib/domain";

/**
 * Exercises the live bKash callback handler with signed payloads. No bKash
 * sandbox credentials exist in this environment, so this proves our half of the
 * contract — signature enforcement, status mapping, provider gating and return
 * routing — not bKash's. Nothing here reaches the network or moves money.
 *
 * The real verifyProviderSignature is kept; only confirmPayment is stubbed, so
 * signature checking is genuinely executed rather than mocked away.
 */

const WEBHOOK_SECRET = "test-webhook-secret";

const confirmPayment = vi.fn();

vi.mock("@/server/store", () => ({
  addPaymentLog: vi.fn(),
  getPaymentById: vi.fn(),
  getPaymentByTransactionId: vi.fn(),
  updateOrderPayment: vi.fn(),
  upsertPayment: vi.fn(),
}));

vi.mock("@/server/integrations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/integrations")>();
  return { ...actual, confirmPayment };
});

const { POST } = await import("@/app/api/payments/[provider]/callback/route");

function sign(body: string, secret = WEBHOOK_SECRET) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function callback(
  body: string,
  { provider = "bkash", signature }: { provider?: string; signature?: string | null } = {},
) {
  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded" });
  if (signature !== null) headers.set("x-signature", signature ?? sign(body));

  const request = new Request("https://bornohin.com/api/payments/bkash/callback", {
    method: "POST",
    headers,
    body,
  }) as NextRequest;

  return POST(request, { params: Promise.resolve({ provider }) });
}

function payment(): Payment {
  return {
    id: "payment-1",
    orderId: "order-1",
    provider: "bkash",
    transactionId: "trx-1",
    amount: 1_630,
    status: "paid",
    rawResponse: {},
    createdAt: "2026-07-28T00:00:00.000Z",
    updatedAt: "2026-07-28T00:00:00.000Z",
  };
}

const PAID = "paymentId=payment-1&status=paid&transactionId=trx-1";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BKASH_WEBHOOK_SECRET = WEBHOOK_SECRET;
  confirmPayment.mockResolvedValue(payment());
});

afterEach(() => {
  delete process.env.BKASH_WEBHOOK_SECRET;
});

test("a correctly signed paid callback confirms the payment and returns the customer to success", async () => {
  const response = await callback(PAID);

  expect(confirmPayment).toHaveBeenCalledWith(
    { paymentId: "payment-1", transactionId: "trx-1" },
    "paid",
    expect.objectContaining({ provider: "bkash", source: "callback" }),
  );
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toContain("/payments/bkash/success");
});

test("failed and cancelled callbacks route to the cancelled page, not success", async () => {
  for (const status of ["failed", "cancelled", "refunded"]) {
    confirmPayment.mockResolvedValue({ ...payment(), status: status as Payment["status"] });
    const body = `paymentId=payment-1&status=${status}&transactionId=trx-1`;

    const response = await callback(body);

    expect(response.headers.get("location"), status).toContain("/payments/bkash/cancelled");
  }
});

test("an unsigned callback is rejected", async () => {
  const response = await callback(PAID, { signature: null });

  expect(response.status).toBe(401);
  expect(confirmPayment).not.toHaveBeenCalled();
});

test("a wrong signature is rejected", async () => {
  const response = await callback(PAID, { signature: sign(PAID, "someone-elses-secret") });

  expect(response.status).toBe(401);
  expect(confirmPayment).not.toHaveBeenCalled();
});

test("a body tampered with after signing is rejected", async () => {
  // Same signature, amount swapped underneath it.
  const signature = sign(PAID);
  const tampered = `${PAID}&amount=1`;

  const response = await callback(tampered, { signature });

  expect(response.status).toBe(401);
  expect(confirmPayment).not.toHaveBeenCalled();
});

test("callbacks for any provider other than bKash are refused", async () => {
  const response = await callback(PAID, { provider: "nagad" });

  expect(response.status).toBe(404);
  expect(confirmPayment).not.toHaveBeenCalled();
});

test("an unrecognised status is refused before any signature work", async () => {
  const body = "paymentId=payment-1&status=settled&transactionId=trx-1";

  const response = await callback(body);

  expect(response.status).toBe(400);
  expect(confirmPayment).not.toHaveBeenCalled();
});

test("a callback with no payment reference is refused", async () => {
  const response = await callback("status=paid");

  expect(response.status).toBe(400);
  expect(confirmPayment).not.toHaveBeenCalled();
});

test("callbacks are refused outright when no webhook secret is configured", async () => {
  delete process.env.BKASH_WEBHOOK_SECRET;
  delete process.env.BKASH_APP_SECRET;

  const response = await callback(PAID);

  expect(response.status).toBe(503);
  expect(confirmPayment).not.toHaveBeenCalled();
});

test("an unknown payment reports not found rather than redirecting to success", async () => {
  confirmPayment.mockResolvedValue(null);

  const response = await callback(PAID);

  expect(response.status).toBe(404);
});

test("a duplicate callback is accepted idempotently and never confirms twice", async () => {
  const first = await callback(PAID);
  const second = await callback(PAID);

  // Both are honoured — bKash retries are normal — but confirmPayment owns the
  // replay check, so the route must forward an identical request both times.
  expect(first.headers.get("location")).toBe(second.headers.get("location"));
  expect(confirmPayment).toHaveBeenCalledTimes(2);
  expect(confirmPayment.mock.calls[0]).toEqual(confirmPayment.mock.calls[1]);
});
