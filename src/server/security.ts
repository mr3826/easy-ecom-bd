import crypto from "node:crypto";
import { headers as getHeaders } from "next/headers";
import type { PaymentProviderKey, PaymentStatus } from "@/lib/domain";
import { getSiteOrigin } from "@/lib/site-url";

type HeaderSource = Pick<Headers, "get">;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  scope: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
  store?: Map<string, RateLimitBucket>;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

const sharedRateLimitStore = new Map<string, RateLimitBucket>();

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeOrigin(value: string | null | undefined) {
  const trimmed = normalizeText(value);
  if (!trimmed) return "";
  try {
    return new URL(trimmed).origin;
  } catch {
    return "";
  }
}

function getConfiguredOrigins() {
  const explicit = [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]
    .map(normalizeOrigin)
    .filter(Boolean);
  if (explicit.length) return explicit;
  return [normalizeOrigin(getSiteOrigin())].filter(Boolean);
}

function getExpectedOrigin(requestHeaders: HeaderSource) {
  const configuredOrigins = getConfiguredOrigins();
  if (configuredOrigins.length) {
    return configuredOrigins[0];
  }

  const host = normalizeText(requestHeaders.get("x-forwarded-host")) || normalizeText(requestHeaders.get("host"));
  if (!host) return "";

  const protocol =
    normalizeText(requestHeaders.get("x-forwarded-proto")) ||
    (process.env.NODE_ENV === "production" ? "https" : "http");

  return `${protocol}://${host}`;
}

export function getClientIp(requestHeaders: HeaderSource) {
  const forwardedFor = normalizeText(requestHeaders.get("x-forwarded-for"));
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const connectingIp = normalizeText(requestHeaders.get("cf-connecting-ip"));
  if (connectingIp) return connectingIp;

  const realIp = normalizeText(requestHeaders.get("x-real-ip"));
  if (realIp) return realIp;

  return "unknown";
}

export function isSameOriginRequest(requestHeaders: HeaderSource) {
  const expectedOrigin = getExpectedOrigin(requestHeaders);
  const origin = normalizeOrigin(requestHeaders.get("origin"));
  const referer = normalizeOrigin(requestHeaders.get("referer"));
  const requestOrigin = origin || referer;

  if (!requestOrigin || !expectedOrigin) {
    return true;
  }

  return requestOrigin === expectedOrigin;
}

export async function requireSameOrigin(operation: string, requestHeaders?: HeaderSource) {
  const resolvedHeaders = requestHeaders ?? (await getHeaders());
  if (!isSameOriginRequest(resolvedHeaders)) {
    throw new Error(`${operation} must be submitted from the application origin`);
  }
  return resolvedHeaders;
}

export function buildSecurityKey(...parts: Array<string | null | undefined>) {
  return parts
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .join("|");
}

function cleanupExpiredBuckets(store: Map<string, RateLimitBucket>, now: number) {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function consumeRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = options.now ?? Date.now();
  const store = options.store ?? sharedRateLimitStore;
  const bucketKey = `${options.scope}:${options.key || "unknown"}`;

  cleanupExpiredBuckets(store, now);

  const current = store.get(bucketKey);
  if (!current || current.resetAt <= now) {
    const resetAt = now + options.windowMs;
    store.set(bucketKey, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, options.limit - 1),
      resetAt,
    };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterMs: Math.max(0, current.resetAt - now),
    };
  }

  current.count += 1;
  store.set(bucketKey, current);

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - current.count),
    resetAt: current.resetAt,
  };
}

export function assertRateLimit(options: RateLimitOptions) {
  const result = consumeRateLimit(options);
  if (!result.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((result.retryAfterMs ?? 0) / 1000));
    throw new Error(`${options.scope} rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`);
  }
  return result;
}

function normalizeForFingerprint(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForFingerprint(item));
  }

  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(source)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => [key, normalizeForFingerprint(source[key])]),
    );
  }

  return value;
}

function stripVolatileVerificationFields(payload: Record<string, unknown>) {
  const { body: _body, ...rest } = payload;
  void _body;
  return normalizeForFingerprint(rest);
}

export function buildPaymentCallbackFingerprint(
  payment: Pick<{
    id: string;
    orderId: string;
    provider: PaymentProviderKey;
    transactionId: string;
  }, "id" | "orderId" | "provider" | "transactionId">,
  status: PaymentStatus,
  verificationPayload: Record<string, unknown>,
) {
  const canonicalPayload = JSON.stringify({
    paymentId: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    transactionId: payment.transactionId,
    status,
    verificationPayload: stripVolatileVerificationFields(verificationPayload),
  });

  return crypto.createHash("sha256").update(canonicalPayload).digest("hex");
}
