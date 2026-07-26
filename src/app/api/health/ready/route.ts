import { NextResponse } from "next/server";
import { buildReadinessReport } from "@/server/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await buildReadinessReport();

  return NextResponse.json(report, {
    status: report.ok ? 200 : 503,
  });
}
