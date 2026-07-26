import crypto from "node:crypto";
import { expect, test } from "vitest";
import { verifyProviderSignature } from "@/server/integrations";

test("payment callback signatures require an exact HMAC match", () => {
  const body = "paymentId=payment-1&status=paid";
  const secret = "test-webhook-secret";
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

  expect(verifyProviderSignature(body, signature, secret)).toBe(true);
  expect(verifyProviderSignature(body, null, secret)).toBe(false);
  expect(verifyProviderSignature(body, "invalid", secret)).toBe(false);
  expect(verifyProviderSignature(`${body}&amount=1`, signature, secret)).toBe(false);
});
