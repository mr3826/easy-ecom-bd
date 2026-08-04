import { expect, test } from "vitest";
import { buildOrderTrackingHref } from "@/lib/order-tracking";

test("payment success tracking href uses the order tracking route", () => {
  expect(buildOrderTrackingHref("EE-240621-1001")).toBe("/track-order?code=EE-240621-1001");
  expect(buildOrderTrackingHref("  EE-240621-1001  ")).toBe("/track-order?code=EE-240621-1001");
  expect(buildOrderTrackingHref(null)).toBe("/track-order");
});
