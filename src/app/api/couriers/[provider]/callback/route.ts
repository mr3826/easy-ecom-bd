import { NextRequest, NextResponse } from "next/server";
import { syncCourierStatusByReference, verifyProviderSignature } from "@/server/integrations";
import { getPathaoIntegrationConfig, getSteadfastIntegrationConfig } from "@/server/integration-config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const body = await request.text();
  const form = new URLSearchParams(body);
  const shipmentId = form.get("shipmentId") ?? form.get("shipmentID") ?? "";
  const trackingId = form.get("trackingId") ?? form.get("trackingID") ?? "";
  const consignmentId = form.get("consignmentId") ?? form.get("consignmentID") ?? "";
  const status = form.get("status") as "picked_up" | "in_transit" | "delivered" | "returned" | "cancelled";
  const signature = request.headers.get("x-signature");
  const config =
    provider === "pathao" ? getPathaoIntegrationConfig() : provider === "steadfast" ? getSteadfastIntegrationConfig() : null;

  if (!config) {
    return NextResponse.json({ ok: false, error: "Unsupported courier provider" }, { status: 404 });
  }
  const secret = config.webhookSecret;

  if (signature && secret && !verifyProviderSignature(body, signature, secret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const shipment = await syncCourierStatusByReference(
    {
      shipmentId,
      trackingId,
      consignmentId,
    },
    status,
  );
  if (!shipment) {
    return NextResponse.json({ ok: false, error: "Shipment not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, shipment });
}
