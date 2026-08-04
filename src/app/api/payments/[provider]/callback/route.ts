import { NextRequest, NextResponse } from "next/server";
import { confirmPayment, verifyProviderSignature } from "@/server/integrations";
import { getBkashIntegrationConfig } from "@/server/integration-config";
import { assertRateLimit, buildSecurityKey, getClientIp } from "@/server/security";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const body = await request.text();
  const form = new URLSearchParams(body);
  const paymentId = form.get("paymentId") ?? form.get("paymentID") ?? "";
  const transactionId = form.get("transactionId") ?? form.get("trxId") ?? "";
  const status = form.get("status") ?? "";
  const signature = request.headers.get("x-signature");
  if (provider !== "bkash") {
    return NextResponse.json({ ok: false, error: "Unsupported payment provider" }, { status: 404 });
  }

  if (!["paid", "failed", "cancelled", "refunded"].includes(status)) {
    return NextResponse.json({ ok: false, error: "Invalid payment status" }, { status: 400 });
  }

  if (!paymentId && !transactionId) {
    return NextResponse.json({ ok: false, error: "Missing payment reference" }, { status: 400 });
  }

  const secret = getBkashIntegrationConfig().webhookSecret;

  if (!secret) {
    return NextResponse.json({ ok: false, error: "Payment callback is not configured" }, { status: 503 });
  }

  if (!verifyProviderSignature(body, signature, secret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  assertRateLimit({
    scope: "paymentCallback",
    key: buildSecurityKey(provider, paymentId || transactionId || "unknown", getClientIp(request.headers)),
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  const payment = await confirmPayment(
    {
      paymentId,
      transactionId,
    },
    status as "paid" | "failed" | "cancelled" | "refunded",
    {
      provider,
      source: "callback",
      body,
      form: Object.fromEntries([...form.entries()].sort(([left], [right]) => left.localeCompare(right))),
    },
  );

  if (!payment) {
    return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 });
  }

  const redirectBase = `/payments/${provider}/${status === "paid" ? "success" : "cancelled"}?paymentId=${payment.id}`;
  return NextResponse.redirect(new URL(redirectBase, request.url));
}
