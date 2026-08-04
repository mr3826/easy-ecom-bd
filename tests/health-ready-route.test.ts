import { expect, test, vi } from "vitest";

vi.mock("@/server/readiness", () => ({
  buildReadinessReport: vi.fn(),
}));

import { GET } from "@/app/api/health/ready/route";
import { buildReadinessReport } from "@/server/readiness";

const mockBuildReadinessReport = vi.mocked(buildReadinessReport);

test("ready route returns a 200 response with the readiness payload", async () => {
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

  const response = await GET();
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

test("ready route returns a 503 response when readiness fails", async () => {
  mockBuildReadinessReport.mockResolvedValueOnce({
    ok: false,
    state: "not_ready",
    service: "bornohin-api",
    timestamp: "2026-07-26T00:00:00.000Z",
    checks: [
      {
        name: "postgresql",
        required: true,
        status: "fail",
        reason: "DATABASE_URL is not configured",
      },
    ],
  });

  const response = await GET();
  const body = await response.json();

  expect(response.status).toBe(503);
  expect(body).toEqual({
    ok: false,
    state: "not_ready",
    service: "bornohin-api",
    timestamp: "2026-07-26T00:00:00.000Z",
    checks: [
      {
        name: "postgresql",
        required: true,
        status: "fail",
        reason: "DATABASE_URL is not configured",
      },
    ],
  });
});
