import { expect, test } from "vitest";
import { getPostLoginRedirectPath } from "@/server/auth";

test("production admins and super admins land on the admin dashboard after login", () => {
  expect(getPostLoginRedirectPath("admin")).toBe("/admin");
  expect(getPostLoginRedirectPath("super_admin")).toBe("/admin");
  expect(getPostLoginRedirectPath("customer")).toBe("/account");
});
