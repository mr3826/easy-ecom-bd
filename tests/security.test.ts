import crypto from "node:crypto";
import { expect, test } from "vitest";
import { verifyProviderSignature } from "@/server/integrations";
import { consumeRateLimit, isSameOriginRequest } from "@/server/security";

test("payment callback signatures require an exact HMAC match", () => {
  const body = "paymentId=payment-1&status=paid";
  const secret = "test-webhook-secret";
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

  expect(verifyProviderSignature(body, signature, secret)).toBe(true);
  expect(verifyProviderSignature(body, null, secret)).toBe(false);
  expect(verifyProviderSignature(body, "invalid", secret)).toBe(false);
  expect(verifyProviderSignature(`${body}&amount=1`, signature, secret)).toBe(false);
});

test("same-origin protection accepts the application origin and rejects cross-site requests", () => {
  const allowed = new Headers({
    origin: "https://bornohin.com",
    host: "bornohin.com",
    "x-forwarded-proto": "https",
  });
  const blocked = new Headers({
    origin: "https://evil.example",
    host: "bornohin.com",
    "x-forwarded-proto": "https",
  });

  expect(isSameOriginRequest(allowed)).toBe(true);
  expect(isSameOriginRequest(blocked)).toBe(false);
});

test("rate limiting blocks requests after the configured window budget is exhausted", () => {
  const store = new Map<string, { count: number; resetAt: number }>();

  expect(
    consumeRateLimit({
      scope: "auth:login",
      key: "127.0.0.1|test@example.com",
      limit: 2,
      windowMs: 1_000,
      now: 1_000,
      store,
    }),
  ).toMatchObject({ allowed: true, remaining: 1, resetAt: 2_000 });

  expect(
    consumeRateLimit({
      scope: "auth:login",
      key: "127.0.0.1|test@example.com",
      limit: 2,
      windowMs: 1_000,
      now: 1_100,
      store,
    }),
  ).toMatchObject({ allowed: true, remaining: 0, resetAt: 2_000 });

  expect(
    consumeRateLimit({
      scope: "auth:login",
      key: "127.0.0.1|test@example.com",
      limit: 2,
      windowMs: 1_000,
      now: 1_200,
      store,
    }),
  ).toMatchObject({ allowed: false, remaining: 0, retryAfterMs: 800 });

  expect(
    consumeRateLimit({
      scope: "auth:login",
      key: "127.0.0.1|test@example.com",
      limit: 2,
      windowMs: 1_000,
      now: 2_100,
      store,
    }),
  ).toMatchObject({ allowed: true, remaining: 1, resetAt: 3_100 });
});
