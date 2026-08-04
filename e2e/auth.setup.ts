import { test as setup, expect } from "@playwright/test";
import { ADMIN_STATE } from "./paths";


const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@easy-ecom.test";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin1234";

/**
 * Authenticate once and reuse the session. Logging in per-test trips the app's
 * own login rate limiter (src/server/security.ts) — which is correct behaviour
 * worth keeping, so the tests adapt to it rather than the other way round.
 */
setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 }),
    page.getByRole("button", { name: /log in|sign in|login/i }).click(),
  ]);

  await page.goto("/admin");
  await expect(page.locator("h1:visible").first()).toBeVisible();

  await page.context().storageState({ path: ADMIN_STATE });
});
