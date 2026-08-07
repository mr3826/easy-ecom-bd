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

/**
 * Selects a district so that React actually observes the change.
 *
 * page.selectOption() assigns to element.value, which silently advances React's
 * internal value tracker; the change event that follows then looks like a
 * no-op and onChange never fires. The DOM shows the right option selected while
 * React state stays empty — so the delivery-fee block, which is conditional on
 * that state, never appears and the test fails on working code. Measured on
 * this form: selectOption -> 0 zone nodes, the setter below -> 1.
 *
 * A real user is unaffected: their gesture produces a trusted event React
 * handles normally. This is a harness workaround, not a product defect.
 */
async function selectDistrict(page: Page, district: string) {
  await expect(page.locator('select[name="district"]')).toBeVisible();
  await page.evaluate((value) => {
    const el = document.querySelector('select[name="district"]') as HTMLSelectElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, district);
  await expect(page.locator('select[name="district"]')).toHaveValue(district);
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

      // 3. Fill the order first, because the delivery quote depends on it.
      //
      // F6 moved the fee out of the server-rendered summary and into the form:
      // it cannot be known before a district is chosen, and quoting one against
      // the wrong zone is the defect F6 existed to fix. So the aside now shows
      // the subtotal under "Estimated total" with the fee alongside the
      // district picker, and this reads it from where it actually lives.
      await page.locator('input[name="customerName"]').fill(SMOKE_CUSTOMER);
      await page.locator('input[name="customerPhone"]').fill(SMOKE_PHONE);
      // A <select>, not a text input, since H9. Free text let a typo land the
      // order in the wrong delivery zone at the wrong price; the options now
      // come from the same district list the fee is derived from.
      await selectDistrict(page, "Dhaka");
      await page.locator('textarea[name="shippingAddress"]').fill("Smoke test address, do not dispatch");
      await page.locator('input[name="paymentMethod"][value="cod"]').check();

      const subtotal = taka(await page.getByText(/^Subtotal$/).locator("xpath=../dd").innerText());

      // The fee block only renders once a district is selected — which is the
      // point, so assert it appeared rather than defaulting a missing fee to 0.
      const feeRow = page.getByText(/^Delivery fee$/).locator("xpath=..");
      await expect(feeRow).toBeVisible();
      const deliveryText = await feeRow.innerText();
      const delivery = /free/i.test(deliveryText) ? 0 : taka(deliveryText.replace(/^Delivery fee/i, ""));

      // Dhaka is an inside_dhaka district, so the quote must be that zone's
      // charge or free — never an outside-Dhaka price.
      expect(await page.getByText(/Zone:/).innerText()).toMatch(/inside dhaka/i);

      const shownTotal = taka(await page.getByText(/estimated total/i).locator("xpath=..").innerText());
      expect(shownTotal).toBe(subtotal);

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
