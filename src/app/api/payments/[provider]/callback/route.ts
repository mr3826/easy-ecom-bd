import { NextRequest, NextResponse } from "next/server";
import { confirmPayment, verifyProviderSignature } from "@/server/integrations";
import { getBkashIntegrationConfig } from "@/server/integration-config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const body = await request.text();
  const form = new URLSearchParams(body);
  const paymentId = form.get("paymentId") ?? form.get("paymentID") ?? "";
  const transactionId = form.get("transactionId") ?? form.get("trxId") ?? "";
  const status = (form.get("status") ?? "failed") as "paid" | "failed" | "cancelled" | "refunded";
  const signature = request.headers.get("x-signature");
  if (provider !== "bkash") {
    return NextResponse.json({ ok: false, error: "Unsupported payment provider" }, { status: 404 });
  }
  const secret = getBkashIntegrationConfig().webhookSecret;

  if (signature && secret && !verifyProviderSignature(body, signature, secret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const payment = await confirmPayment(
    {
      paymentId,
      transactionId,
    },
    status,
    {
      provider,
      source: "callback",
      body,
      form: Object.fromEntries(form.entries()),
    },
  );

  if (!payment) {
    return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 });
  }

  const redirectBase = `/payments/${provider}/${status === "paid" ? "success" : "cancelled"}?paymentId=${payment.id}`;
  return NextResponse.redirect(new URL(redirectBase, request.url));
}
