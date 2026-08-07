import { randomUUID } from "crypto";
import { afterEach, expect, test as baseTest, vi } from "vitest";
import { compareSync } from "bcryptjs";

/*
H1: a password reset must revoke every existing session and every outstanding
reset token for that user. Anything less means a stolen session cookie — the
usual reason someone resets a password — survives the reset, and a second reset
link sitting in an inbox stays redeemable.

Unlike login-action.test.ts this file does NOT mock @/server/store or
@/server/auth: the whole point is proving the rows are gone from a real
database. Only Next's request-scoped runtime is stubbed, because
resetPasswordAction is called directly rather than through a request.
*/
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: async () =>
    new Headers({
      host: "bornohin.com",
      origin: "https://bornohin.com",
      "x-forwarded-proto": "https",
    }),
}));

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
const test = baseTest.skipIf(!hasDatabase);

const { getPrisma } = await import("@/server/db");
const prisma = hasDatabase ? getPrisma() : (undefined as unknown as ReturnType<typeof getPrisma>);

function unique(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

const createdUserIds: string[] = [];

afterEach(async () => {
  if (!hasDatabase || createdUserIds.length === 0) return;
  const ids = createdUserIds.splice(0);
  await prisma.session.deleteMany({ where: { userId: { in: ids } } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

async function makeUserWithSessionsAndTokens() {
  const { createUser } = await import("@/server/store");
  const { createPasswordResetToken } = await import("@/server/auth");

  const user = await createUser({
    name: "Reset Test",
    email: `${unique("test-reset")}@test.local`,
    passwordHash: "$2a$10$notarealhashnotarealhashnotarealhashnotarealhashnotare",
  });
  createdUserIds.push(user.id);

  // Two sessions: one is not enough to tell "deleted the row we looked up"
  // from "deleted every session for this user".
  await prisma.session.createMany({
    data: [1, 2].map((n) => ({
      userId: user.id,
      tokenHash: `test-session-hash-${n}-${randomUUID()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })),
  });

  // Two reset tokens: the second stands in for a link already sitting in an
  // inbox from an earlier request. Consuming one must not leave the other live.
  const token = await createPasswordResetToken(user.email);
  const siblingToken = await createPasswordResetToken(user.email);
  expect(token, "createPasswordResetToken returned no token").toBeTruthy();
  expect(siblingToken, "createPasswordResetToken returned no sibling token").toBeTruthy();

  return { user, token: token as string, siblingToken: siblingToken as string };
}

test("H1: resetting a password revokes every session and every outstanding reset token", async () => {
  const { resetPasswordAction } = await import("@/app/actions");
  const { user, token } = await makeUserWithSessionsAndTokens();

  expect(await prisma.session.count({ where: { userId: user.id } })).toBe(2);
  expect(await prisma.passwordResetToken.count({ where: { userId: user.id } })).toBe(2);

  const form = new FormData();
  form.set("token", token);
  form.set("password", "a-new-strong-password");
  form.set("confirmPassword", "a-new-strong-password");

  const result = await resetPasswordAction({}, form);
  expect(result.error, `reset failed: ${result.error}`).toBeUndefined();
  expect(result.success).toBeTruthy();

  expect(
    await prisma.session.count({ where: { userId: user.id } }),
    "sessions survived the reset",
  ).toBe(0);
  expect(
    await prisma.passwordResetToken.count({ where: { userId: user.id } }),
    "the sibling reset token is still redeemable",
  ).toBe(0);

  const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(compareSync("a-new-strong-password", stored.passwordHash)).toBe(true);
});

test("H1: a reset that is rejected leaves sessions and tokens alone", async () => {
  const { resetPasswordAction } = await import("@/app/actions");
  const { user } = await makeUserWithSessionsAndTokens();

  const form = new FormData();
  form.set("token", "not-a-real-token");
  form.set("password", "a-new-strong-password");
  form.set("confirmPassword", "a-new-strong-password");

  const result = await resetPasswordAction({}, form);
  expect(result.error).toBeTruthy();

  // Revocation must be a consequence of a successful reset, never of merely
  // submitting the form — otherwise an attacker logs everyone out for free.
  expect(await prisma.session.count({ where: { userId: user.id } })).toBe(2);
  expect(await prisma.passwordResetToken.count({ where: { userId: user.id } })).toBe(2);
});
