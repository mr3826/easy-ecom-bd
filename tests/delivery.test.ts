import { describe, expect, test } from "vitest";
import {
  DELIVERY_ZONE_VALUES,
  deriveDeliveryZone,
  getDeliveryChargeForZone,
  isDeliveryZone,
} from "@/lib/delivery";

const settings = {
  freeDeliveryThreshold: 2000,
  insideDhakaDeliveryCharge: 60,
  subDhakaDeliveryCharge: 90,
  outsideDhakaDeliveryCharge: 130,
};

describe("deriveDeliveryZone", () => {
  test("maps known inside_dhaka districts", () => {
    expect(deriveDeliveryZone("Dhaka")).toBe("inside_dhaka");
    expect(deriveDeliveryZone("gulshan")).toBe("inside_dhaka");
    expect(deriveDeliveryZone("Mirpur")).toBe("inside_dhaka");
  });

  test("maps known sub_dhaka districts", () => {
    expect(deriveDeliveryZone("Gazipur")).toBe("sub_dhaka");
    expect(deriveDeliveryZone("Narayanganj")).toBe("sub_dhaka");
  });

  test("defaults to outside_dhaka for unknown districts", () => {
    expect(deriveDeliveryZone("Chittagong")).toBe("outside_dhaka");
    expect(deriveDeliveryZone("Sylhet")).toBe("outside_dhaka");
    expect(deriveDeliveryZone("")).toBe("outside_dhaka");
  });
});

describe("getDeliveryChargeForZone", () => {
  test("returns zero when subtotal meets the free-delivery threshold", () => {
    expect(getDeliveryChargeForZone(settings, "inside_dhaka", 2000)).toBe(0);
    expect(getDeliveryChargeForZone(settings, "outside_dhaka", 5000)).toBe(0);
  });

  test("charges the configured amount per zone below threshold", () => {
    expect(getDeliveryChargeForZone(settings, "inside_dhaka", 0)).toBe(60);
    expect(getDeliveryChargeForZone(settings, "sub_dhaka", 0)).toBe(90);
    expect(getDeliveryChargeForZone(settings, "outside_dhaka", 0)).toBe(130);
  });

  test("uses the discounted subtotal when computing the fee", () => {
    // 1000 cart with a 400 discount = 600 post-discount, still below the
    // threshold, so the inside_dhaka fee (60) is what both the form and the
    // store should quote.
    expect(getDeliveryChargeForZone(settings, "inside_dhaka", 600)).toBe(60);
  });
});

describe("zone guard rails", () => {
  test("isDeliveryZone accepts every enum value", () => {
    for (const zone of DELIVERY_ZONE_VALUES) {
      expect(isDeliveryZone(zone)).toBe(true);
    }
  });

  test("isDeliveryZone rejects free-form district text", () => {
    expect(isDeliveryZone("Dhaka")).toBe(false);
    expect(isDeliveryZone("inside_dhaka_2")).toBe(false);
    expect(isDeliveryZone(null)).toBe(false);
  });
});
