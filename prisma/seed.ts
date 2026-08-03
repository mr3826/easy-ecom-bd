import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  confirmationError,
  describeTarget,
  insertDemoData,
  parseArgs,
  wipe,
} from "../scripts/db-reset";

/**
 * Prisma's seed hook (prisma.config.ts, `prisma db seed`, `prisma migrate reset`).
 * The wipe and the demo data both live in scripts/db-reset.ts so there is one
 * implementation of each; this file only wires them to Prisma's entry point.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  // The same guard db:reset uses. Without it, a shell that happens to hold a
  // production DATABASE_URL turns `prisma db seed` into a production wipe.
  const target = describeTarget(connectionString);
  const refusal = confirmationError(target, parseArgs(process.argv.slice(2)).confirmed);
  if (refusal) throw new Error(refusal);

  const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });
  try {
    await wipe(prisma);
    await insertDemoData(prisma);
    console.log(`Seeded ${target.database} on ${target.host}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
