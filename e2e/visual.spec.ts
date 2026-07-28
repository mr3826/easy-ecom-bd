import { test, expect } from "@playwright/test";

/**
 * Pixel baseline for the layouts the responsive work fixed. Its real job is to
 * catch a shared-CSS edit — particularly the @layer ordering in globals.css,
 * which is load-bearing in both directions — silently undoing them.
 *
 * Opt-in (E2E_VISUAL=1) because baselines are rendered per-platform: the
 * snapshots committed here are Windows/Chromium and would fail everywhere else.
 * Refresh with: E2E_VISUAL=1 npx playwright test e2e/visual.spec.ts --update-snapshots
 */

const WIDTHS = [320, 375, 768, 1024, 1440];

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/shop", name: "shop" },
  { path: "/checkout", name: "checkout" },
  { path: "/login", name: "login" },
];

test.describe("visual baseline", () => {
  test.use({ reducedMotion: "reduce" });

  test.beforeEach(({}, testInfo) => {
    test.skip(process.env.E2E_VISUAL !== "1", "set E2E_VISUAL=1 to run the pixel baseline");
    test.skip(testInfo.project.name !== "desktop-1280", "widths are set per-test; one project is enough");
  });

  for (const route of ROUTES) {
    test(`${route.name} holds its layout across the width matrix`, async ({ page }) => {
      test.setTimeout(120_000);

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route.path, { waitUntil: "networkidle" });
        // Webfonts swapping in after the shot is the main source of noise.
        await page.evaluate(() => document.fonts.ready);

        await expect(page).toHaveScreenshot(`${route.name}-${width}.png`, {
          fullPage: true,
          animations: "disabled",
          // Absorbs sub-pixel text rendering without hiding a real layout shift.
          maxDiffPixelRatio: 0.01,
        });
      }
    });
  }
});
