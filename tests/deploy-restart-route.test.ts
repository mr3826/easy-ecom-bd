import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "@/app/api/deploy/restart/route";

const ORIGINAL_TOKEN = process.env.DEPLOY_RESTART_TOKEN;
let exitSpy: ReturnType<typeof vi.spyOn>;

function post(headers: Record<string, string> = {}) {
  return POST(new Request("https://bornohin.com/api/deploy/restart", {
    method: "POST",
    headers,
  }) as NextRequest);
}

beforeEach(() => {
  vi.useFakeTimers();
  // The route schedules process.exit; letting that run would kill the runner.
  exitSpy = vi.spyOn(process, "exit").mockImplementation(((() => undefined) as never));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.DEPLOY_RESTART_TOKEN;
  } else {
    process.env.DEPLOY_RESTART_TOKEN = ORIGINAL_TOKEN;
  }
});

test("the endpoint does not exist unless a token is configured", async () => {
  delete process.env.DEPLOY_RESTART_TOKEN;

  const response = await post({ "x-deploy-token": "anything" });

  expect(response.status).toBe(404);
  vi.runAllTimers();
  expect(exitSpy).not.toHaveBeenCalled();
});

test("a wrong token is rejected and the process keeps running", async () => {
  process.env.DEPLOY_RESTART_TOKEN = "s3cret-deploy-token";

  const response = await post({ "x-deploy-token": "not-the-token" });

  expect(response.status).toBe(401);
  vi.runAllTimers();
  expect(exitSpy).not.toHaveBeenCalled();
});

test("a missing token header is rejected", async () => {
  process.env.DEPLOY_RESTART_TOKEN = "s3cret-deploy-token";

  const response = await post();

  expect(response.status).toBe(401);
  vi.runAllTimers();
  expect(exitSpy).not.toHaveBeenCalled();
});

test("the correct token answers first, then exits the process", async () => {
  process.env.DEPLOY_RESTART_TOKEN = "s3cret-deploy-token";

  const response = await post({ "x-deploy-token": "s3cret-deploy-token" });
  const body = await response.json();

  // The response has to be written before the process goes away, or the deploy
  // cannot tell "restarted" apart from "unreachable".
  expect(response.status).toBe(200);
  expect(body).toMatchObject({ ok: true, pid: process.pid });
  expect(exitSpy).not.toHaveBeenCalled();

  vi.runAllTimers();
  expect(exitSpy).toHaveBeenCalledWith(0);
});
