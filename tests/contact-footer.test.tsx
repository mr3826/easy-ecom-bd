import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Settings } from "@/lib/domain";
import { expect, test, vi } from "vitest";

const getSettingsMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/store", () => ({
  getSettings: getSettingsMock,
}));

vi.mock("@/components/public-shell", () => ({
  PublicShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function mockSettings(overrides: Partial<Settings> = {}) {
  getSettingsMock.mockResolvedValue({
    storeName: "Bornohin",
    logoText: "Bornohin",
    logoUrl: null,
    supportEmail: "support@example.com",
    contactNumber: "01700 123 456",
    address: "Dhaka",
    businessHours: "10:00 AM - 8:00 PM",
    deliveryAreas: ["Dhaka"],
    returnRefundPolicy: "Returns handled by support",
    confirmationMessageTemplate: "We will confirm your order soon.",
    metaPixelId: null,
    gtmContainerId: null,
    deliveryCharge: 80,
    freeDeliveryThreshold: 1000,
    codEnabled: true,
    bkashEnabled: false,
    bkashAccountNumber: null,
    bkashInstructions: "",
    nagadEnabled: false,
    nagadAccountNumber: null,
    nagadInstructions: "",
    rocketEnabled: false,
    rocketAccountNumber: null,
    rocketInstructions: "",
    insideDhakaDeliveryCharge: 80,
    subDhakaDeliveryCharge: 100,
    outsideDhakaDeliveryCharge: 130,
    insideDhakaCodEnabled: true,
    subDhakaCodEnabled: true,
    outsideDhakaCodEnabled: true,
    ...overrides,
  } as Settings);
}

test("site footer mobile contact link uses the admin contact number", async () => {
  mockSettings({ contactNumber: "01800 777 888" });
  const { SiteFooter } = await import("@/components/site-footer");
  const html = renderToStaticMarkup(await SiteFooter());

  expect(html).toContain('href="tel:01800777888"');
  expect(html).not.toContain('href="tel:09639279024"');
});

test("contact page renders live settings data instead of a hardcoded contact block", async () => {
  mockSettings({
    address: "House 12, Road 5, Dhaka",
    contactNumber: "01911 222 333",
    supportEmail: "help@bornohin.com",
    businessHours: "9:00 AM - 9:00 PM",
  });
  const { default: ContactPage } = await import("@/app/contact-us/page");
  const html = renderToStaticMarkup(await ContactPage());

  expect(html).toContain("House 12, Road 5, Dhaka");
  expect(html).toContain("01911 222 333");
  expect(html).toContain("help@bornohin.com");
  expect(html).toContain("9:00 AM - 9:00 PM");
  expect(html).not.toContain("09639279024");
});
