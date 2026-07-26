import { vi, expect, test } from "vitest";
import { buildReadinessReport } from "@/server/readiness";

test("reports ready when PostgreSQL is configured and reachable", async () => {
  const report = await buildReadinessReport({
    databaseUrl: "postgres://example",
    now: () => new Date("2026-07-26T00:00:00.000Z"),
    probePostgres: async () => undefined,
  });

  expect(report).toEqual({
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

test("fails fast when PostgreSQL is misconfigured and does not probe the database", async () => {
  const probePostgres = vi.fn(async () => undefined);

  const report = await buildReadinessReport({
    databaseUrl: "   ",
    now: () => new Date("2026-07-26T00:00:00.000Z"),
    probePostgres,
  });

  expect(probePostgres).not.toHaveBeenCalled();
  expect(report.ok).toBe(false);
  expect(report.state).toBe("not_ready");
  expect(report.checks).toEqual([
    {
      name: "postgresql",
      required: true,
      status: "fail",
      reason: "DATABASE_URL is not configured",
    },
  ]);
});

test("sanitizes PostgreSQL failures in the readiness payload", async () => {
  const report = await buildReadinessReport({
    databaseUrl: "postgres://user:secret@db.example.internal/ecommerce",
    now: () => new Date("2026-07-26T00:00:00.000Z"),
    probePostgres: async () => {
      throw new Error("postgres://user:secret@db.example.internal/ecommerce");
    },
  });

  expect(report.ok).toBe(false);
  expect(report.state).toBe("not_ready");
  expect(report.checks).toEqual([
    {
      name: "postgresql",
      required: true,
      status: "fail",
      reason: "PostgreSQL is unavailable",
    },
  ]);
  expect(JSON.stringify(report)).not.toContain("secret");
});
