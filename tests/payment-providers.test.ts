import { describe, expect, test } from "vitest";
import { paymentProviders } from "@/lib/domain";

describe("payment providers", () => {
  test("only exposes COD and bKash to the app", () => {
    expect(paymentProviders.map((provider) => provider.key)).toEqual(["cod", "bkash"]);
  });
});
