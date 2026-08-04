import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tokenMatches(provided: string, expected: string) {
  // timingSafeEqual throws when the lengths differ, which would itself leak the
  // token length, so compare fixed-width digests instead of the raw bytes.
  return crypto.timingSafeEqual(
    crypto.createHash("sha256").update(provided).digest(),
    crypto.createHash("sha256").update(expected).digest(),
  );
}

/**
 * Lets a deploy stop the process that is actually serving traffic.
 *
 * On this host a Next process can end up orphaned to PPID 1, at which point
 * Passenger can no longer see it: restart.txt, the cPanel Restart button and
 * cloudlinux-selector all report success while the old build keeps answering.
 * The one thing that still reaches such a process is an HTTP request — so it
 * is asked to exit itself, and the platform respawns on the new build.
 *
 * Disabled unless DEPLOY_RESTART_TOKEN is set.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.DEPLOY_RESTART_TOKEN?.trim();
  if (!expected) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 404 });
  }

  const provided = request.headers.get("x-deploy-token") ?? "";
  if (!provided || !tokenMatches(provided, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = {
    ok: true,
    pid: process.pid,
    commit: process.env.NEXT_PUBLIC_RELEASE_COMMIT || null,
  };

  // Long enough for this response to flush before the process goes away.
  setTimeout(() => process.exit(0), 500);

  return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
}
