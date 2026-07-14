import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "/uploads");

const contentTypeByExtension: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function getContentType(filePath: string) {
  return contentTypeByExtension[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function resolveSafePath(segments: string[]) {
  const relative = segments.join("/");
  const resolved = path.resolve(uploadRoot, relative);
  if (!resolved.startsWith(uploadRoot)) {
    throw new Error("Invalid upload path");
  }
  return resolved;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> | { path?: string[] } },
) {
  const params = await Promise.resolve(context.params);
  const segments = params.path ?? [];
  console.log("[uploads]", { segments, uploadRoot });
  if (!segments.length) {
    return NextResponse.json({ error: "Missing upload path" }, { status: 404 });
  }

  let absolutePath: string;
  try {
    absolutePath = resolveSafePath(segments);
  } catch {
    return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
  }

  try {
    const file = await readFile(absolutePath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": getContentType(absolutePath),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
