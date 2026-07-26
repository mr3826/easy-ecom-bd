import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  const databaseUrl = required("DATABASE_URL");
  const email = required("ADMIN_EMAIL").toLowerCase();
  const password = required("ADMIN_PASSWORD");
  const name = process.env.ADMIN_NAME?.trim() || "Bornohin Admin";

  if (password.length < 14) {
    throw new Error("ADMIN_PASSWORD must contain at least 14 characters");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg(databaseUrl),
  });

  try {
    const passwordHash = await hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      create: {
        name,
        email,
        passwordHash,
        role: "super_admin",
      },
      update: {
        name,
        passwordHash,
        role: "super_admin",
      },
    });
    console.log(`Production administrator is ready: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
