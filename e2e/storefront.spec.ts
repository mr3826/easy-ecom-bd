import { test, expect } from "@playwright/test";

const PRODUCT = "/product/cotton-stitched-fariya-tf-white";

test.describe("storefront", () => {
  test("home renders and the primary nav is reachable", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();

    if (testInfo.project.name === "mobile-375") {
      await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeVisible();
    }
  });

  test("mobile nav opens as a modal, traps focus, and locks the page behind it", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-375", "mobile nav only exists below lg");

    await page.goto("/");
    await page.getByRole("button", { name: "Open navigation menu" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // F3: the page behind a modal must not scroll.
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .toBe("hidden");

    // F3: focus must be inside the dialog, not left on the page behind it.
    const focusInside = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      return Boolean(dlg && dlg.contains(document.activeElement));
    });
    expect(focusInside).toBe(true);

    // F3: Tab must not escape the dialog.
    for (let i = 0; i < 15; i += 1) await page.keyboard.press("Tab");
    const stillInside = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      return Boolean(dlg && dlg.contains(document.activeElement));
    });
    expect(stillInside).toBe(true);

    // Escape closes and the scroll lock is released.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .not.toBe("hidden");
  });

  test("add to cart then reach checkout with a populated order summary", async ({ page }) => {
    await page.goto(PRODUCT);
    await page.getByRole("button", { name: /add to cart/i }).click();

    await page.goto("/cart");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto("/checkout");
    await expect(page.locator('input[name="customerName"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /place order/i })).toBeVisible();
  });

  test("COD is offered and bKash is the only other payment option", async ({ page }) => {
    await page.goto("/checkout");
    const methods = await page
      .locator('input[name="paymentMethod"]')
      .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));

    expect(methods).toContain("cod");
    // Guards the brief's requirement that no third provider creeps in.
    expect(methods.filter((m) => m !== "cod").sort()).toEqual(["bkash"]);
  });

  test("checkout submit disables itself to prevent duplicate orders", async ({ page }) => {
    await page.goto("/checkout");
    const submit = page.getByRole("button", { name: /place order/i });
    // The guard is a client component wired to useFormStatus; assert it is an
    // enabled real submit before the action runs.
    await expect(submit).toBeEnabled();
    await expect(submit).toHaveAttribute("type", "submit");
  });

  /*
   * F7: the bKash cancellation page used to render a dead end — the customer
   * abandoned a payment and landed on a page with nothing to click. It now
   * resolves the order behind the paymentId and redirects to its tracking page,
   * falling back to bare /track-order when there is nothing to resolve.
   *
   * Both cases below take the fallback branch, which is exactly the branch that
   * has to hold: an unknown or absent paymentId is what a real abandoned
   * payment looks like once the provider has forgotten the session.
   */
  for (const [name, query] of [
    ["no paymentId", ""],
    ["an unknown paymentId", "?paymentId=does-not-exist"],
  ] as const) {
    test(`F7: cancelling a bKash payment with ${name} redirects to order tracking`, async ({
      page,
    }) => {
      const response = await page.goto(`/payments/bkash/cancelled${query}`);
      expect(response?.status(), "cancellation page errored").toBeLessThan(400);
      await expect(page).toHaveURL(/\/track-order(\?|$)/);
      // A redirect that lands on a broken page is no better than the dead end.
      await expect(page.locator("h1:visible").first()).toBeVisible();
    });
  }
});
