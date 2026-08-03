import { expect, test } from "vitest";
import { confirmationError, describeTarget, parseArgs } from "../scripts/db-reset";

const LOCAL = "postgresql://postgres:postgres@localhost:5432/ecommerce";
const PRODUCTION = "postgresql://bornohin_ecomapp:secret@bd10.exonhost.com:5432/bornohin_ecom";

test("the target is read from the connection string, not from a flag", () => {
  expect(describeTarget(LOCAL)).toEqual({ host: "localhost", database: "ecommerce", local: true });
  expect(describeTarget(PRODUCTION)).toEqual({
    host: "bd10.exonhost.com",
    database: "bornohin_ecom",
    local: false,
  });
  expect(describeTarget("postgresql://u:p@127.0.0.1:5432/ecommerce").local).toBe(true);
});

test("wiping localhost stays one command", () => {
  expect(confirmationError(describeTarget(LOCAL), null)).toBeNull();
});

test("a remote database is refused until its name is typed back", () => {
  const target = describeTarget(PRODUCTION);

  // The whole point of the guard: a stray production DATABASE_URL in the shell
  // must not be enough to empty it.
  expect(confirmationError(target, null)).toContain("--confirm bornohin_ecom");
  expect(confirmationError(target, "ecommerce")).toContain("does not match");
  expect(confirmationError(target, "bornohin_ecom")).toBeNull();
});

test("--confirm consumes the following argument", () => {
  expect(parseArgs(["--seed", "--confirm", "bornohin_ecom"])).toEqual({
    seed: true,
    adminOnly: false,
    confirmed: "bornohin_ecom",
  });
  // A trailing --confirm must not silently read as "confirmed".
  expect(parseArgs(["--confirm"]).confirmed).toBeNull();
  expect(parseArgs([])).toEqual({ seed: false, adminOnly: false, confirmed: null });
});
