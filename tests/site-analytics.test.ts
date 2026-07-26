import { renderToStaticMarkup } from "react-dom/server";
import type { Settings } from "@/lib/domain";
import {
  normalizeGtmContainerId,
  normalizeMetaPixelId,
} from "@/lib/analytics-ids";
import { expect, test, vi } from "vitest";

const getSettingsMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/store", () => ({
  getSettings: getSettingsMock,
}));

function renderSettings(settings: Partial<Settings>) {
  getSettingsMock.mockResolvedValue(settings as Settings);
}

async function renderSiteAnalytics(settings: Partial<Settings>) {
  renderSettings(settings);
  const { SiteAnalytics } = await import("@/components/site-analytics");
  return renderToStaticMarkup(await SiteAnalytics());
}

test("analytics id helpers normalize valid ids and reject malicious input", () => {
  expect(normalizeGtmContainerId(" gtm-ab12cd3 ")).toBe("GTM-AB12CD3");
  expect(normalizeGtmContainerId('GTM-ABC123"><script>alert(1)</script>')).toBeNull();
  expect(normalizeMetaPixelId(" 1234567890 ")).toBe("1234567890");
  expect(normalizeMetaPixelId('12345";alert(1)//')).toBeNull();
});

test("site analytics strips invalid ids from rendered markup", async () => {
  const maliciousGtm = 'GTM-ABC123"><script>alert(1)</script>';
  const html = await renderSiteAnalytics({
    gtmContainerId: maliciousGtm,
    metaPixelId: "1234567890",
  });

  expect(html).not.toContain(maliciousGtm);
  expect(html).not.toContain("alert(1)");
  expect(html).not.toContain("googletagmanager.com/gtm.js");
  expect(html).toContain('fbq(\'init\', "1234567890")');
  expect(html).toContain("connect.facebook.net/en_US/fbevents.js");
});

test("site analytics still renders valid gtm and meta ids", async () => {
  const html = await renderSiteAnalytics({
    gtmContainerId: " gtm-ab12cd3 ",
    metaPixelId: " 9876543210 ",
  });

  expect(html).toContain('"GTM-AB12CD3"');
  expect(html).toContain("googletagmanager.com/ns.html?id=GTM-AB12CD3");
  expect(html).toContain('fbq(\'init\', "9876543210")');
  expect(html).toContain("facebook.com/tr?id=9876543210&amp;ev=PageView&amp;noscript=1");
});
