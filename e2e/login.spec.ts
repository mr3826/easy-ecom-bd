import { test, expect } from "@playwright/test";

/**
 * F14. Every one of these paths used to throw out of the server action and take
 * the whole page down with a runtime error overlay.
 */

const PASSWORD_FIELD = 'input[name="password"]';
const EMAIL_FIELD = 'input[name="email"]';

/**
 * Scoped to the form: Next's own route announcer is also role="alert", so a
 * bare getByRole("alert") matches two elements and never settles.
 */
function formAlert(page: import("@playwright/test").Page) {
  return page.locator('form > [role="alert"]');
}

async function attempt(page: import("@playwright/test").Page, email: string, password: string) {
  await page.locator(EMAIL_FIELD).fill(email);
  await page.locator(PASSWORD_FIELD).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

/**
 * Waits for the action's own response. The error banner from the previous
 * attempt is still on screen, so asserting on it alone races ahead of the
 * server and undercounts submissions.
 */
async function attemptAndSettle(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/login")),
    attempt(page, email, password),
  ]);
}

test.describe("login error handling", () => {
  test("wrong credentials show a message and leave the form usable", async ({ page }) => {
    await page.goto("/login");
    await attempt(page, "nobody@example.test", "definitely-wrong");

    const alert = formAlert(page);
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText(/email or password is not correct/i);

    // Still on /login, not on an error page.
    expect(new URL(page.url()).pathname).toBe("/login");
    // The entered address survives a rejected attempt.
    await expect(page.locator(EMAIL_FIELD)).toHaveValue("nobody@example.test");
    // The submit is usable again rather than stuck disabled.
    await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
  });

  test("the password is never echoed back after a failure", async ({ page }) => {
    await page.goto("/login");
    await attempt(page, "nobody@example.test", "definitely-wrong");
    await expect(formAlert(page)).toBeVisible();

    await expect(page.locator(PASSWORD_FIELD)).toHaveValue("");
  });

  test("hitting the rate limit reports it instead of crashing", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1280", "one run is enough to exhaust the bucket");

    // Unique per run so the 15-minute bucket cannot leak into other specs.
    const email = `ratelimit-${Date.now()}@example.test`;
    await page.goto("/login");

    // The limiter allows 10 attempts per address per IP in 15 minutes.
    for (let i = 0; i < 10; i += 1) {
      await attemptAndSettle(page, email, "wrong");
      await expect(formAlert(page)).toHaveText(/email or password is not correct/i);
    }

    await attemptAndSettle(page, email, "wrong");
    await expect(formAlert(page)).toHaveText(/too many login attempts/i);
    // The limit is reported in the page, not thrown out of the action.
    expect(new URL(page.url()).pathname).toBe("/login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
  });

  test("a dropped connection leaves a recoverable page, not a blank one", async ({ page }) => {
    await page.goto("/login");

    // Server actions POST back to the same path; kill that request only.
    await page.route("**/login", (route) =>
      route.request().method() === "POST" ? route.abort("failed") : route.continue(),
    );

    await attempt(page, "nobody@example.test", "whatever");

    // The route-level boundary must catch it and offer a way forward. Without
    // src/app/error.tsx this escalated to global-error, which replaces the whole
    // document and leaves the user with no control at all.
    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /did not go through/i })).toBeVisible();
  });

  test("no internal detail is exposed in any error message", async ({ page }) => {
    await page.goto("/login");
    await attempt(page, "nobody@example.test", "definitely-wrong");
    await expect(formAlert(page)).toBeVisible();

    const body = await page.locator("body").innerText();
    for (const leak of ["ECONNREFUSED", "prisma", "postgres", "at async", "passwordHash"]) {
      expect(body.toLowerCase()).not.toContain(leak.toLowerCase());
    }
  });

  test("valid credentials still sign in", async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL ?? "admin@easy-ecom.test";
    const password = process.env.E2E_ADMIN_PASSWORD ?? "admin1234";

    await page.goto("/login");
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 }),
      attempt(page, email, password),
    ]);

    expect(new URL(page.url()).pathname).toBe("/admin");
  });
});
