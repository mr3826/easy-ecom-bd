import { test, expect } from "@playwright/test";

/**
 * Direct proof for the foundation findings (F1, F4, F6, F7). These assert the
 * *mechanism*, not the appearance — each one previously looked correct in
 * source while doing nothing at runtime.
 */
test.describe("responsive foundations", () => {
  test("F1: viewport-fit=cover is emitted so env(safe-area-inset-*) can resolve", async ({ page }) => {
    await page.goto("/");
    const content = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(content).toContain("viewport-fit=cover");
  });

  test("F1: .safe-bottom resolves to a real padding rather than being dead CSS", async ({ page }) => {
    await page.goto("/");
    // getPropertyValue on a custom property returns the token text, not a
    // resolved length — so measure the effect on a real element instead.
    const padding = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.className = "safe-bottom";
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).paddingBottom;
      probe.remove();
      return value;
    });
    // max(0.75rem, safe-area) — 12px on a device without a notch, more with one.
    expect(parseFloat(padding)).toBeGreaterThanOrEqual(12);
  });

  test("F4: no form control renders below 16px (iOS zoom trigger)", async ({ page }) => {
    await page.goto("/checkout");
    const undersized = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input, select, textarea"))
        .filter((el) => {
          const type = (el as HTMLInputElement).type;
          if (type === "hidden" || type === "checkbox" || type === "radio") return false;
          return parseFloat(getComputedStyle(el).fontSize) < 16;
        })
        .map((el) => `${el.tagName}[name=${(el as HTMLInputElement).name || "?"}]`),
    );
    expect(undersized).toEqual([]);
  });

  test("F5: phone field requests a numeric keypad", async ({ page }) => {
    await page.goto("/checkout");
    const phone = page.locator('input[name="customerPhone"]');
    await expect(phone).toHaveAttribute("type", "tel");
    await expect(phone).toHaveAttribute("inputmode", "numeric");
    await expect(phone).toHaveAttribute("autocomplete", "tel");
  });

  test("F6: page shells use svh, not vh, so mobile chrome cannot cause overflow", async ({ page }) => {
    await page.goto("/");
    const usesRawVh = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>("*")).some((el) =>
        /(^|[^s d])100vh/.test(el.style.minHeight || ""),
      ),
    );
    expect(usesRawVh).toBe(false);
  });

  test("F7: a prefers-reduced-motion rule is present in the stylesheet", async ({ page }) => {
    await page.goto("/");
    const hasRule = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue; // cross-origin sheet
        }
        const walk = (list: CSSRuleList): boolean =>
          Array.from(list).some((rule) => {
            if (rule instanceof CSSMediaRule) {
              if (rule.conditionText.includes("prefers-reduced-motion")) return true;
              return walk(rule.cssRules);
            }
            if ("cssRules" in rule) return walk((rule as CSSGroupingRule).cssRules);
            return false;
          });
        if (walk(rules)) return true;
      }
      return false;
    });
    expect(hasRule).toBe(true);
  });

  test("F7: motion is actually suppressed when the user asks for it", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    const scrollBehavior = await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    );
    expect(scrollBehavior).toBe("auto");
    await context.close();
  });
});
