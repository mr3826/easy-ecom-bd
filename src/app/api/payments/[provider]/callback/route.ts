import { NextRequest, NextResponse } from "next/server";
import { confirmPayment, verifyProviderSignature } from "@/server/integrations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const body = await request.text();
  const form = new URLSearchParams(body);
  const paymentId = form.get("paymentId") ?? "";
  const status = (form.get("status") ?? "failed") as "paid" | "failed" | "cancelled" | "refunded";
  const signature = request.headers.get("x-signature");
  const secret = provider === "bkash" ? process.env.BKASH_APP_SECRET || "" : process.env.NAGAD_MERCHANT_PRIVATE_KEY || "";

  if (signature && secret && !verifyProviderSignature(body, signature, secret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const payment = await confirmPayment(paymentId, status, {
    provider,
    source: "callback",
    body,
  });

  if (!payment) {
    return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 });
  }

  const redirectBase = `/payments/${provider}/${status === "paid" ? "success" : "cancelled"}?paymentId=${payment.id}`;
  return NextResponse.redirect(new URL(redirectBase, request.url));
}

