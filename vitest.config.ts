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
    // Vitest defaults to 5s, which is too tight for this suite. The integration
    // tests hit a real database, and the auth ones additionally run bcrypt at
    // cost 10 synchronously, which blocks a worker for as long as it takes. On
    // an idle machine reset-password-action.test.ts finishes in under 2s, but
    // running all 19 files in parallel on a loaded machine pushed it to 5521ms
    // and failed a deploy on a timeout rather than on anything being wrong.
    //
    // Raised rather than applied per-test: the same contention reaches every
    // bcrypt-bound test, so pinning one of them just moves the flake. 20s is
    // still far below any genuine hang.
    testTimeout: 20_000,
  },
});
