import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Inlined by the compiler at build time, so it identifies the code this process
 * actually loaded. Reading the commit from disk instead would make an orphaned
 * process report the release that was just extracted underneath it — precisely
 * the failure this endpoint exists to catch.
 */
const RUNNING_COMMIT = process.env.NEXT_PUBLIC_RELEASE_COMMIT || null;

/** Written into the bundle by scripts/deploy-cpanel.ps1; describes what is on disk. */
function readExtractedRelease() {
  try {
    const raw = readFileSync(path.join(process.cwd(), "RELEASE.json"), "utf8");
    // Strip a UTF-8 BOM before parsing. Windows PowerShell 5.1's `Set-Content
    // -Encoding UTF8` writes one, and every deploy script uses it, so the file is
    // valid JSON with one leading byte that JSON.parse rejects. Without this the
    // catch below swallowed the SyntaxError and reported extractedCommit: null on a
    // present, correct file — leaving the stale-release check permanently inert.
    const parsed = JSON.parse(raw.replace(/^﻿/, "")) as { releaseCommit?: string; deployedAt?: string };
    return { commit: parsed.releaseCommit || null, deployedAt: parsed.deployedAt || null };
  } catch {
    return { commit: null, deployedAt: null };
  }
}

export async function GET() {
  const extracted = readExtractedRelease();
  // Files for a newer release sitting beside a process still serving the old one.
  const stale = Boolean(RUNNING_COMMIT && extracted.commit && RUNNING_COMMIT !== extracted.commit);

  return NextResponse.json(
    {
      status: stale ? "stale" : "ready",
      commit: RUNNING_COMMIT,
      extractedCommit: extracted.commit,
      deployedAt: extracted.deployedAt,
      // Lets a caller spot several processes answering on different builds.
      pid: process.pid,
      startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    },
    {
      status: stale ? 409 : 200,
      headers: { "cache-control": "no-store" },
    },
  );
}
