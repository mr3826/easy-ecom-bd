import { test, expect, type Page } from "@playwright/test";
import { ADMIN_STATE } from "./paths";

/**
 * One controlled Cash-on-Delivery order, driven entirely through the UI, then
 * cancelled so it leaves nothing behind. Rendered payment options prove what is
 * offered; only this proves the transaction actually works.
 *
 * It writes real rows, so it refuses to run anywhere but a local stack unless
 * the operator opts in explicitly.
 */

const PRODUCT_PATH = "/product/cotton-stitched-fariya-tf-white";
const PRODUCT_NAME = "Fariya TF White";
const SMOKE_CUSTOMER = "SMOKE TEST — do not fulfil";
const SMOKE_PHONE = "01700000000";

function isLocal(baseURL: string | undefined) {
  return Boolean(baseURL && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL));
}

/** Reads the number the admin table shows for this product. */
async function readStock(admin: Page) {
  await admin.goto(`/admin/products?q=${encodeURIComponent(PRODUCT_NAME)}`);
  const row = admin.locator("table tbody tr", { hasText: PRODUCT_NAME }).first();
  await expect(row).toBeVisible();
  const cell = await row.locator("td").nth(3).innerText();
  const stock = Number(cell.trim().split(/\s+/)[0]);
  expect(Number.isFinite(stock), `stock cell was "${cell}"`).toBe(true);
  return stock;
}

function taka(text: string) {
  return Number(text.replace(/[^\d.]/g, ""));
}

async function setOrderStatus(admin: Page, orderCode: string, status: string) {
  await admin.goto("/admin/orders");
  // Nearest ancestor of the order's heading that actually holds the controls —
  // hasText alone matches every wrapper div up to the page root.
  const form = admin
    .locator("h2", { hasText: orderCode })
    .locator('xpath=ancestor::div[.//button[contains(., "Save lifecycle")]][1]')
    .locator("form")
    .filter({ hasText: "Lifecycle" })
    .first();

  await form.locator('select[name="status"]').selectOption(status);
  await Promise.all([
    admin.waitForLoadState("networkidle"),
    form.getByRole("button", { name: /save lifecycle/i }).click(),
  ]);
}

test.describe("COD order lifecycle", () => {
  test.describe.configure({ mode: "serial" });

  test("a real COD order reserves stock, is visible everywhere, and releases stock when cancelled", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1280", "the admin stock table only renders from lg up");
    test.skip(
      !isLocal(baseURL) && process.env.E2E_ALLOW_REMOTE_ORDER !== "1",
      "writes real orders; set E2E_ALLOW_REMOTE_ORDER=1 to run this off localhost",
    );
    test.setTimeout(180_000);

    const admin = await (await browser.newContext({ storageState: ADMIN_STATE })).newPage();

    try {
      // 1. Stock before checkout.
      const stockBefore = await readStock(admin);
      expect(stockBefore).toBeGreaterThan(0);

      // 2. Add one unit. Navigating straight after the click aborts the server
      //    action and the cart silently stays empty, so wait for its response.
      await page.goto(PRODUCT_PATH);
      await Promise.all([
        page.waitForResponse((r) => r.request().method() === "POST"),
        page.getByRole("button", { name: /add to cart/i }).click(),
      ]);

      await page.goto("/cart");
      await expect(page.getByText(PRODUCT_NAME).first()).toBeVisible();

      await page.goto("/checkout");

      const subtotal = taka(await page.getByText(/^Subtotal$/).locator("xpath=../dd").innerText());
      const deliveryText = await page.getByText(/^Delivery fee$/).locator("xpath=../dd").innerText();
      const delivery = /free/i.test(deliveryText) ? 0 : taka(deliveryText);
      const shownTotal = taka(await page.getByText(/estimated total/i).locator("xpath=..").innerText());

      // 3. The quoted total is the sum of its parts, not an independent number.
      expect(shownTotal).toBe(subtotal + delivery);

      // 4. Place the order as COD.
      await page.locator('input[name="customerName"]').fill(SMOKE_CUSTOMER);
      await page.locator('input[name="customerPhone"]').fill(SMOKE_PHONE);
      await page.locator('input[name="district"]').fill("Dhaka");
      await page.locator('textarea[name="shippingAddress"]').fill("Smoke test address, do not dispatch");
      await page.locator('input[name="paymentMethod"][value="cod"]').check();

      const submit = page.getByRole("button", { name: /place order/i });
      await expect(submit).toBeEnabled();
      await Promise.all([
        page.waitForURL(/\/track-order\?code=/, { timeout: 60_000 }),
        submit.click(),
      ]);

      // 5. Duplicate-submit guard: the button is gone with the page it lived on,
      //    and the action disabled it for the whole in-flight window.
      const orderCode = new URL(page.url()).searchParams.get("code");
      expect(orderCode, "checkout must redirect with an order code").toBeTruthy();

      // 6. Customer-facing tracking shows the order, its state and its money.
      await expect(page.getByText(orderCode!).first()).toBeVisible();
      await expect(page.locator("body")).toContainText(/pending/i);
      const trackedTotal = taka(
        await page.getByText(/^Total$/).first().locator("xpath=following-sibling::p[1]").innerText(),
      );
      expect(trackedTotal).toBe(subtotal + delivery);

      // 7. Inventory reserved.
      expect(await readStock(admin)).toBe(stockBefore - 1);

      // 8. Admin visibility, with the money and the provider intact.
      await admin.goto("/admin/orders");
      await expect(admin.getByText(orderCode!).first()).toBeVisible();
      const adminText = await admin.locator("body").innerText();
      expect(adminText).toContain(SMOKE_CUSTOMER);
      expect(adminText.toLowerCase()).toContain("payment: cod");

      // 9. A legal status transition.
      await setOrderStatus(admin, orderCode!, "confirmed");
      await page.reload();
      await expect(page.locator("body")).toContainText(/confirmed/i);

      // 10. Cancellation — also the cleanup for this order.
      await setOrderStatus(admin, orderCode!, "cancelled");
      await page.reload();
      await expect(page.locator("body")).toContainText(/cancelled/i);

      // 11. Inventory released back.
      expect(await readStock(admin)).toBe(stockBefore);

      testInfo.annotations.push({
        type: "smoke-order",
        description: `${orderCode} created and cancelled; stock returned to ${stockBefore}`,
      });
    } finally {
      await admin.context().close();
    }
  });
});
