import { afterEach, expect, test, vi } from "vitest";

const readFileSync = vi.fn();
vi.mock("node:fs", () => ({ readFileSync: (...args: unknown[]) => readFileSync(...args) }));

const ORIGINAL_COMMIT = process.env.NEXT_PUBLIC_RELEASE_COMMIT;

/**
 * The route reads the running commit at module scope, so each case needs a
 * fresh module instance — exactly as a real process only ever sees the commit
 * it was compiled with.
 */
async function callVersion(runningCommit: string | undefined, releaseFile: string | Error) {
  vi.resetModules();
  if (runningCommit === undefined) {
    delete process.env.NEXT_PUBLIC_RELEASE_COMMIT;
  } else {
    process.env.NEXT_PUBLIC_RELEASE_COMMIT = runningCommit;
  }
  readFileSync.mockImplementation(() => {
    if (releaseFile instanceof Error) throw releaseFile;
    return releaseFile;
  });

  const { GET } = await import("@/app/api/version/route");
  const response = await GET();
  return { response, body: await response.json() };
}

function releaseJson(commit: string) {
  return JSON.stringify({ releaseCommit: commit, deployedAt: "2026-07-28T12:00:00.000Z" });
}

afterEach(() => {
  if (ORIGINAL_COMMIT === undefined) {
    delete process.env.NEXT_PUBLIC_RELEASE_COMMIT;
  } else {
    process.env.NEXT_PUBLIC_RELEASE_COMMIT = ORIGINAL_COMMIT;
  }
});

test("a process running the extracted release reports ready", async () => {
  const { response, body } = await callVersion("abc123", releaseJson("abc123"));

  expect(response.status).toBe(200);
  expect(body.status).toBe("ready");
  expect(body.commit).toBe("abc123");
  expect(body.pid).toBe(process.pid);
});

test("a process older than the files on disk reports stale, not ready", async () => {
  // The deploy has extracted def456 while this process still runs abc123 —
  // the exact condition that made a previous deploy look successful.
  const { response, body } = await callVersion("abc123", releaseJson("def456"));

  expect(response.status).toBe(409);
  expect(body.status).toBe("stale");
  expect(body.commit).toBe("abc123");
  expect(body.extractedCommit).toBe("def456");
});

test("the reported commit comes from the running bundle, never from disk", async () => {
  const { body } = await callVersion("abc123", releaseJson("def456"));

  // If this ever reported def456, a stale process would announce the new
  // release and the deploy gate would pass on a build nobody is serving.
  expect(body.commit).not.toBe("def456");
});

test("a missing RELEASE.json cannot make a healthy process look stale", async () => {
  const { response, body } = await callVersion("abc123", new Error("ENOENT"));

  expect(response.status).toBe(200);
  expect(body.status).toBe("ready");
  expect(body.extractedCommit).toBeNull();
});

test("development builds without a compiled commit still answer", async () => {
  const { response, body } = await callVersion(undefined, new Error("ENOENT"));

  expect(response.status).toBe(200);
  expect(body.commit).toBeNull();
  expect(body.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test("responses are never cached", async () => {
  const { response } = await callVersion("abc123", releaseJson("abc123"));

  expect(response.headers.get("cache-control")).toBe("no-store");
});
