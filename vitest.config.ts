import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Without this, DATABASE_URL from .env never reaches the test process, so
// tests/persistence.test.ts skipped its whole suite on developer machines as
// well as in CI — 13 integration tests reporting green while never running.
// Next and prisma.config.ts both load .env; the test runner did not.
import "dotenv/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(root, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
    exclude: ["**/node_modules/**", ".next/**", ".kilo/**"],
  },
});
