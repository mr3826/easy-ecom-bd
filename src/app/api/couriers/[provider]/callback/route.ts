import { NextRequest, NextResponse } from "next/server";
import { syncCourierStatus, verifyProviderSignature } from "@/server/integrations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const body = await request.text();
  const form = new URLSearchParams(body);
  const shipmentId = form.get("shipmentId") ?? "";
  const status = form.get("status") as "picked_up" | "in_transit" | "delivered" | "returned" | "cancelled";
  const signature = request.headers.get("x-signature");
  const secret =
    provider === "pathao"
      ? process.env.PATHAO_CLIENT_SECRET || process.env.PATHAO_PASSWORD || ""
      : process.env.STEADFAST_SECRET_KEY || "";

  if (signature && secret && !verifyProviderSignature(body, signature, secret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const shipment = syncCourierStatus(shipmentId, status);
  if (!shipment) {
    return NextResponse.json({ ok: false, error: "Shipment not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, shipment });
}

