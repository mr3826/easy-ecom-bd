import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __easyEcomPrisma: PrismaClient | undefined;
}

export function getPrisma() {
  if (!globalThis.__easyEcomPrisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    globalThis.__easyEcomPrisma = new PrismaClient({
      adapter: new PrismaPg(connectionString),
    });
  }
  return globalThis.__easyEcomPrisma;
}

export const prisma = getPrisma;
