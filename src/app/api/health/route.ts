import { NextRequest, NextResponse } from "next/server";
import { buildReadinessReport } from "@/server/readiness";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("ready") === "1") {
    const report = await buildReadinessReport();

    return NextResponse.json(report, {
      status: report.ok ? 200 : 503,
    });
  }

  return NextResponse.json({
    ok: true,
    service: "bornohin-api",
    timestamp: new Date().toISOString(),
  });
}
