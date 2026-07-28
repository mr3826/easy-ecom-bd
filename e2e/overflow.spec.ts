import { test, expect } from "@playwright/test";

/**
 * The mechanical guard for "no unexplained page-level horizontal overflow".
 * Runs the full width matrix in one project — the widths are set per-test, so
 * running it under both device projects would only duplicate work.
 */
const WIDTHS = [320, 360, 375, 390, 412, 768, 1024, 1280, 1440];

const ROUTES = [
  "/",
  "/shop",
  "/search",
  "/cart",
  "/checkout",
  "/login",
  "/register",
  "/track-order",
  "/about-us",
  "/contact-us",
  "/faq",
  "/privacy",
  "/terms",
  "/cookie-policy",
  "/product/cotton-stitched-fariya-tf-white",
];

test.describe("no horizontal overflow", () => {
  // Widths are set per-test, so running the matrix under both device projects
  // would only duplicate the same work.
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1280", "width matrix runs once");
  });

  for (const route of ROUTES) {
    test(`${route} holds across ${WIDTHS[0]}-${WIDTHS[WIDTHS.length - 1]}px`, async ({ page }) => {
      const failures: string[] = [];

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        // Let layout settle after the resize before measuring.
        await page.waitForTimeout(150);

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));

        // 1px of tolerance for sub-pixel rounding on fractional scale factors.
        if (scrollWidth > clientWidth + 1) {
          failures.push(`${width}px: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}`);
        }
      }

      expect(failures, `Horizontal overflow on ${route}`).toEqual([]);
    });
  }
});
