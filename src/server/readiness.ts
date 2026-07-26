import { getPrisma } from "@/server/db";

export type ReadinessCheckStatus = "pass" | "fail";

export interface ReadinessCheck {
  name: string;
  required: boolean;
  status: ReadinessCheckStatus;
  reason?: string;
}

export interface ReadinessReport {
  ok: boolean;
  state: "ready" | "not_ready";
  service: string;
  timestamp: string;
  checks: ReadinessCheck[];
}

export interface ReadinessOptions {
  now?: () => Date;
  databaseUrl?: string;
  probePostgres?: () => Promise<void>;
}

function hasText(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

async function probePostgres(): Promise<void> {
  const prisma = getPrisma();
  await prisma.$queryRaw`SELECT 1`;
}

export async function buildReadinessReport(options: ReadinessOptions = {}): Promise<ReadinessReport> {
  const now = options.now ?? (() => new Date());
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  const postgresProbe = options.probePostgres ?? probePostgres;
  const checks: ReadinessCheck[] = [];

  if (!hasText(databaseUrl)) {
    checks.push({
      name: "postgresql",
      required: true,
      status: "fail",
      reason: "DATABASE_URL is not configured",
    });
  } else {
    try {
      await postgresProbe();
      checks.push({
        name: "postgresql",
        required: true,
        status: "pass",
      });
    } catch {
      checks.push({
        name: "postgresql",
        required: true,
        status: "fail",
        reason: "PostgreSQL is unavailable",
      });
    }
  }

  const ok = checks.every((check) => !check.required || check.status === "pass");

  return {
    ok,
    state: ok ? "ready" : "not_ready",
    service: "bornohin-api",
    timestamp: now().toISOString(),
    checks,
  };
}
