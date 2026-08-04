import { NextRequest } from "next/server";
import { expect, test, vi } from "vitest";

vi.mock("@/server/readiness", () => ({
  buildReadinessReport: vi.fn(),
}));

import { GET } from "@/app/api/health/route";
import { buildReadinessReport } from "@/server/readiness";

const mockBuildReadinessReport = vi.mocked(buildReadinessReport);

test("health route returns the basic status payload by default", async () => {
  const response = await GET(new NextRequest("https://bornohin.com/api/health"));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toMatchObject({
    ok: true,
    service: "bornohin-api",
  });
  expect(typeof body.timestamp).toBe("string");
});

test("health route serves readiness data when the ready query flag is present", async () => {
  mockBuildReadinessReport.mockResolvedValueOnce({
    ok: true,
    state: "ready",
    service: "bornohin-api",
    timestamp: "2026-07-26T00:00:00.000Z",
    checks: [
      {
        name: "postgresql",
        required: true,
        status: "pass",
      },
    ],
  });

  const response = await GET(new NextRequest("https://bornohin.com/api/health?ready=1"));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toEqual({
    ok: true,
    state: "ready",
    service: "bornohin-api",
    timestamp: "2026-07-26T00:00:00.000Z",
    checks: [
      {
        name: "postgresql",
        required: true,
        status: "pass",
      },
    ],
  });
});
