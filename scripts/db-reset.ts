import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { createSeedState } from "../src/server/seed";

/**
 * The only way to wipe or reseed a database this project talks to directly.
 *
 *   npm run db:reset                  wipe every table, then recreate the admin
 *   npm run db:reset -- --seed        ... and load the demo catalogue
 *   npm run db:admin                  only create/rotate the admin, no wipe
 *
 * Production's PostgreSQL listens on the cPanel host's loopback and is not
 * reachable from a developer machine, so production is wiped by
 * scripts/wipe-production-db.ps1 instead. Both read prisma/wipe.sql.
 */

export type Target = { host: string; database: string; local: boolean };

/** Parsed so the operator is told, and the guard below can reason about, which
 *  database is about to be emptied. */
export function describeTarget(connectionString: string): Target {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    database: decodeURIComponent(url.pathname).replace(/^\//, ""),
    local: ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname),
  };
}

/**
 * Wiping localhost is routine, so it stays a single command. Anything else is
 * someone's real data: the database name has to be typed back before a row is
 * touched. Returns the reason it refused, or null to proceed.
 */
export function confirmationError(target: Target, confirmed: string | null): string | null {
  if (target.local) return null;
  if (!confirmed) {
    return `Refusing to wipe non-local database "${target.database}" on ${target.host}. ` +
      `Re-run with: --confirm ${target.database}`;
  }
  if (confirmed !== target.database) {
    return `--confirm ${confirmed} does not match the target database "${target.database}".`;
  }
  return null;
}

export function parseArgs(argv: string[]) {
  const confirmIndex = argv.indexOf("--confirm");
  return {
    seed: argv.includes("--seed"),
    adminOnly: argv.includes("--admin-only"),
    confirmed: confirmIndex === -1 ? null : (argv[confirmIndex + 1] ?? null),
  };
}

function getClient(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg(connectionString) });
}

/** Empties every application table. See prisma/wipe.sql for why nothing is listed here. */
export async function wipe(prisma: PrismaClient) {
  const sql = readFileSync(join(process.cwd(), "prisma", "wipe.sql"), "utf8");
  await prisma.$executeRawUnsafe(sql);
}

/**
 * Recreated after every wipe so a reset can never lock anyone out. Upsert, not
 * create, so the same command doubles as the password rotation.
 */
export async function upsertAdmin(prisma: PrismaClient) {
  const email = (process.env.ADMIN_EMAIL?.trim() || "admin@bornohin.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const name = process.env.ADMIN_NAME?.trim() || "Bornohin Admin";

  if (!password) throw new Error("ADMIN_PASSWORD is required to recreate the administrator");
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must contain at least 12 characters");

  const passwordHash = await hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { name, email, passwordHash, role: "super_admin" },
    update: { name, passwordHash, role: "super_admin" },
  });
  return email;
}

/** The demo catalogue, customers and sample order. Never loaded into production. */
export async function insertDemoData(prisma: PrismaClient) {
  const state = createSeedState();

  await prisma.setting.create({ data: state.settings });
  await prisma.user.createMany({ data: state.users });
  await prisma.category.createMany({ data: state.categories });
  await prisma.brand.createMany({ data: state.brands });
  await prisma.product.createMany({
    data: state.products.map(({ metadata, ...product }) => ({
      ...product,
      ...(metadata ? { metadata: JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue } : {}),
    })),
  });
  await prisma.productImage.createMany({ data: state.productImages });
  await prisma.coupon.createMany({ data: state.coupons });
  await prisma.landingPage.createMany({ data: state.landingPages });
  await prisma.landingPageSection.createMany({ data: state.landingPageSections });
  await prisma.cart.createMany({
    data: state.carts.map(({ items, ...rest }) => {
      void items;
      return rest;
    }),
  });
  await prisma.cartItem.createMany({
    data: state.carts.flatMap((cart) => cart.items.map((item) => ({ ...item, cartId: cart.id }))),
  });
  await prisma.order.create({
    data: { ...state.orders[0], items: { create: state.orders[0].items } },
  });
  await prisma.orderStatusHistory.createMany({ data: state.orderStatusHistory });
  await prisma.payment.createMany({
    data: state.payments.map((payment) => ({
      ...payment,
      rawResponse: payment.rawResponse as Prisma.InputJsonValue,
    })),
  });
  await prisma.auditLog.createMany({
    data: state.auditLogs.map((log) => ({
      ...log,
      oldValue: log.oldValue as Prisma.InputJsonValue | undefined,
      newValue: log.newValue as Prisma.InputJsonValue | undefined,
    })),
  });
}

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const { seed, adminOnly, confirmed } = parseArgs(process.argv.slice(2));
  const target = describeTarget(connectionString);

  if (!adminOnly) {
    const refusal = confirmationError(target, confirmed);
    if (refusal) throw new Error(refusal);
  }

  const prisma = getClient(connectionString);
  try {
    if (!adminOnly) {
      console.log(`Wiping ${target.database} on ${target.host}`);
      await wipe(prisma);
      console.log("Every application table is empty");

      if (seed) {
        await insertDemoData(prisma);
        console.log("Demo data loaded");
      }
    }

    const email = await upsertAdmin(prisma);
    console.log(`Administrator ready: ${email}`);

    const [users, products, orders] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
    ]);
    console.log(`Counts: users=${users} products=${products} orders=${orders}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
