import { test, expect } from "@playwright/test";
import { ADMIN_STATE } from "./paths";

test.use({ storageState: ADMIN_STATE });

test.describe("admin", () => {

  test("dashboard, products, orders and settings all render", async ({ page }) => {
    for (const route of ["/admin", "/admin/products", "/admin/orders", "/admin/settings"]) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} status`).toBeLessThan(400);
      await expect(page.locator("h1:visible").first(), `${route} heading`).toBeVisible();
    }
  });

  test("F13: each admin page exposes exactly one h1 — the page title, not branding", async ({
    page,
  }) => {
    for (const route of ["/admin", "/admin/products", "/admin/orders", "/admin/settings"]) {
      await page.goto(route);
      // The shell used to render the store name as <h1> in both the mobile
      // topbar and the desktop sidebar, so every page announced branding as its
      // top-level heading before the actual page title.
      const count = await page.locator("h1").count();
      expect(count, `${route} h1 count`).toBe(1);
    }
  });

  test("products list uses cards below lg and the table above it", async ({ page }, testInfo) => {
    await page.goto("/admin/products");

    const table = page.locator("table");
    if (testInfo.project.name === "mobile-375") {
      // F8: no dense table on small screens.
      await expect(table).toBeHidden();
    } else {
      await expect(table).toBeVisible();
    }
  });

  test("admin pages have no horizontal overflow at 375 and 768", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-375", "width matrix runs once");

    const failures: string[] = [];
    for (const width of [375, 768]) {
      await page.setViewportSize({ width, height: 800 });
      for (const route of ["/admin", "/admin/products", "/admin/orders", "/admin/settings"]) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(150);
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        if (scrollWidth > clientWidth + 1) {
          failures.push(`${route} @${width}px: ${scrollWidth} > ${clientWidth}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  test("the products filter drawer is a real modal", async ({ page }) => {
    await page.goto("/admin/products");
    const trigger = page.getByRole("button", { name: /^filter$/i });
    await trigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .toBe("hidden");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .not.toBe("hidden");
  });

  test("no admin form control renders below 16px", async ({ page }) => {
    await page.goto("/admin/settings");
    const undersized = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input, select, textarea"))
        .filter((el) => {
          const type = (el as HTMLInputElement).type;
          if (type === "hidden" || type === "checkbox" || type === "radio") return false;
          return parseFloat(getComputedStyle(el).fontSize) < 16;
        })
        .map((el) => (el as HTMLInputElement).name || el.tagName),
    );
    expect(undersized).toEqual([]);
  });

  test("a product can be saved with no brand", async ({ page, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1280", "one run is enough; this writes a row");
    // This test CREATES a product. Every other spec here is read-only and safe
    // to point at production; this one would leave junk in a real catalogue.
    const local = Boolean(baseURL && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL));
    test.skip(!local, "writes a product; localhost only");
    // The editor is a 500-line form and the dev server builds it with cpus: 1,
    // so its first authenticated compile can outlast the default budget.
    test.setTimeout(240_000);

    await page.goto("/admin/products/new", { timeout: 180_000 });

    const brand = page.locator('select[name="brandId"]');
    await expect(brand).toBeVisible();
    // The empty option is what makes the field optional at all.
    await expect(brand.locator('option[value=""]')).toHaveCount(1);

    const stamp = Date.now();
    await page.locator('input[name="name"]').fill(`E2E No Brand ${stamp}`);
    await page.locator('textarea[name="description"]').fill("Created by an e2e test to prove brand is optional.");
    await page.locator('input[name="price"]').fill("1500");
    await page.locator('input[name="stock"]').fill("3");
    await brand.selectOption("");

    await page.getByRole("button", { name: /save|create/i }).first().click();

    // A required-field rejection would keep us on the form with an error.
    await expect(page.getByText(/brand is required/i)).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/admin\/products\/new/, { timeout: 60_000 });
    // The list renders cards and a table together and hides one by width, so
    // the row has to be matched on the visible copy.
    await expect(
      page.getByText(`E2E No Brand ${stamp}`).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
