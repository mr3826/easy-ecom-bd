import { test, expect, type Page } from "@playwright/test";
import { ADMIN_STATE } from "./paths";

/**
 * F5: the checkout form used to render a fixed pair of payment radios
 * regardless of what the store had enabled, so a shopper could pick a method
 * the server would then refuse. The radios are now derived from the enabled
 * set, with an explicit empty state when nothing is available.
 *
 * Proving that needs the setting actually toggled — a read-only assertion just
 * re-reads whatever the local database happens to hold. So this writes, and
 * like cod-order.spec.ts it refuses to run anywhere but a local stack and puts
 * the setting back in a finally.
 */

function isLocal(baseURL: string | undefined) {
  return Boolean(baseURL && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL));
}

async function setCodEnabled(admin: Page, enabled: boolean) {
  await admin.goto("/admin/settings");
  const cod = admin.locator('input[name="codEnabled"]');
  await expect(cod).toBeVisible();
  await cod.setChecked(enabled);
  await Promise.all([
    admin.waitForLoadState("networkidle"),
    admin.getByRole("button", { name: /save/i }).first().click(),
  ]);
  await expect(admin.locator('input[name="codEnabled"]')).toBeChecked({ checked: enabled });
}

async function renderedPaymentMethods(page: Page) {
  await page.goto("/checkout");
  return page
    .locator('input[name="paymentMethod"]')
    .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
}

test.describe("payment method availability", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: ADMIN_STATE });

  test("F5: disabling COD removes its radio from checkout", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1280", "one run is enough; this writes settings");
    test.skip(!isLocal(baseURL), "changes store settings; localhost only");
    test.setTimeout(180_000);

    const before = await renderedPaymentMethods(page);
    expect(before, "COD is not enabled to begin with, so disabling it proves nothing").toContain(
      "cod",
    );

    try {
      await setCodEnabled(page, false);

      const after = await renderedPaymentMethods(page);
      expect(after, "COD is still offered after being disabled").not.toContain("cod");

      if (after.length === 0) {
        // Nothing enabled at all: the form must say so rather than render a
        // submit with no method behind it.
        await expect(page.getByText(/no payment method/i)).toBeVisible();
      } else {
        // Whatever remains must be a method the store actually has on.
        expect(after.every((m) => m === "bkash")).toBe(true);
      }
    } finally {
      await setCodEnabled(page, true);
    }

    const restored = await renderedPaymentMethods(page);
    expect(restored, "the test did not restore COD").toContain("cod");
  });
});
