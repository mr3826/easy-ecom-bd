import { beforeEach, expect, test, vi } from "vitest";
import type { Payment } from "@/lib/domain";
import { buildPaymentCallbackFingerprint, confirmPayment } from "@/server/integrations";
import {
  addPaymentLog,
  getPaymentById,
  getPaymentByTransactionId,
  updateOrderPayment,
  upsertPayment,
} from "@/server/store";

vi.mock("@/server/store", () => ({
  addPaymentLog: vi.fn(),
  getPaymentById: vi.fn(),
  getPaymentByTransactionId: vi.fn(),
  updateOrderPayment: vi.fn(),
  upsertPayment: vi.fn(),
}));

const mockedGetPaymentById = vi.mocked(getPaymentById);
const mockedGetPaymentByTransactionId = vi.mocked(getPaymentByTransactionId);
const mockedUpsertPayment = vi.mocked(upsertPayment);
const mockedAddPaymentLog = vi.mocked(addPaymentLog);
const mockedUpdateOrderPayment = vi.mocked(updateOrderPayment);

function makePayment(rawResponse: Record<string, unknown>): Payment {
  return {
    id: "payment-1",
    orderId: "order-1",
    provider: "bkash",
    transactionId: "trx-1",
    amount: 1_000,
    status: "paid",
    rawResponse,
    createdAt: "2026-07-26T00:00:00.000Z",
    updatedAt: "2026-07-26T00:00:00.000Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

test("payment callback fingerprints stay stable across field ordering", () => {
  const payment = makePayment({});
  const payloadA = {
    provider: "bkash",
    source: "callback",
    body: "paymentId=payment-1&status=paid&transactionId=trx-1",
    form: {
      paymentId: "payment-1",
      status: "paid",
      transactionId: "trx-1",
    },
  };
  const payloadB = {
    provider: "bkash",
    source: "callback",
    body: "transactionId=trx-1&status=paid&paymentId=payment-1",
    form: {
      transactionId: "trx-1",
      paymentId: "payment-1",
      status: "paid",
    },
  };

  expect(buildPaymentCallbackFingerprint(payment, "paid", payloadA)).toBe(
    buildPaymentCallbackFingerprint(payment, "paid", payloadB),
  );
});

test("duplicate payment confirmations short-circuit without rewriting state", async () => {
  const payload = {
    provider: "bkash",
    source: "callback",
    body: "paymentId=payment-1&status=paid&transactionId=trx-1",
    form: {
      paymentId: "payment-1",
      status: "paid",
      transactionId: "trx-1",
    },
  };
  const fingerprint = buildPaymentCallbackFingerprint(makePayment({}), "paid", payload);
  const payment = makePayment({
    verificationState: {
      fingerprint,
      status: "paid",
      confirmedAt: "2026-07-26T00:00:00.000Z",
    },
  });

  mockedGetPaymentById.mockResolvedValueOnce(payment);
  mockedGetPaymentByTransactionId.mockResolvedValueOnce(null);

  const result = await confirmPayment("payment-1", "paid", payload);

  expect(result).toBe(payment);
  expect(mockedUpsertPayment).not.toHaveBeenCalled();
  expect(mockedAddPaymentLog).not.toHaveBeenCalled();
  expect(mockedUpdateOrderPayment).not.toHaveBeenCalled();
});
