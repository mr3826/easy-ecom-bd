import { NextResponse } from "next/server";
import { buildProductUploadTemplateCsv } from "@/lib/product-import";

export const runtime = "nodejs";

export async function GET() {
  const csv = buildProductUploadTemplateCsv();
  return new NextResponse(`\ufeff${csv}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bornohin-product-upload-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
