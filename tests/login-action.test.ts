import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { hashSync } from "bcryptjs";

const findUserByEmail = vi.fn();
const setSessionCookie = vi.fn();

/** The real redirect() signals by throwing. The action must not swallow it. */
const redirect = vi.fn((path: string) => {
  throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;replace;${path}` });
});

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {} }),
  headers: async () =>
    new Headers({
      host: "bornohin.com",
      origin: "https://bornohin.com",
      "x-forwarded-proto": "https",
      "x-forwarded-for": "203.0.113.9",
    }),
}));
vi.mock("@/server/store", () => ({
  findUserByEmail,
  addToCart: vi.fn(),
  createOrderFromCart: vi.fn(),
  createUser: vi.fn(),
  getCartSummary: vi.fn(),
  getProduct: vi.fn(),
  getOrCreateCart: vi.fn(),
  listProducts: vi.fn(),
  removeCartItem: vi.fn(),
  updateCartQuantity: vi.fn(),
  clearCart: vi.fn(),
}));
vi.mock("@/server/auth", () => ({
  setSessionCookie,
  clearSessionCookie: vi.fn(),
  getCurrentUser: vi.fn(),
  getPostLoginRedirectPath: (role: string) => (role === "customer" ? "/account" : "/admin"),
}));
vi.mock("@/server/integrations", () => ({ initiateBkashPayment: vi.fn() }));
vi.mock("@/server/integration-config", () => ({
  getBkashIntegrationConfig: () => ({ enabled: false }),
}));

const { loginAction } = await import("@/app/actions");

const PASSWORD = "correct-horse-battery";
const PASSWORD_HASH = hashSync(PASSWORD, 4);

function submit(email: string, password: string) {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("password", password);
  return loginAction({}, formData);
}

/** Each test gets its own address so the shared rate-limit bucket cannot leak. */
let counter = 0;
function uniqueEmail() {
  counter += 1;
  return `login-case-${counter}@example.test`;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  // The mocked request headers claim bornohin.com. requireSameOrigin compares
  // them against APP_URL, so without pinning it these tests inherit whatever
  // .env holds, the origin check fails, and every login is reported as a
  // generic "Something went wrong" rather than the behaviour under test.
  vi.stubEnv("APP_URL", "https://bornohin.com");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://bornohin.com");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

test("wrong credentials return a message instead of throwing", async () => {
  const email = uniqueEmail();
  findUserByEmail.mockResolvedValue({ id: "u1", role: "customer", passwordHash: PASSWORD_HASH });

  const state = await submit(email, "not-the-password");

  expect(state.error).toBe("The email or password is not correct.");
  expect(state.email).toBe(email);
  expect(setSessionCookie).not.toHaveBeenCalled();
  expect(redirect).not.toHaveBeenCalled();
});

test("an unknown address is indistinguishable from a wrong password", async () => {
  findUserByEmail.mockResolvedValue(null);

  const unknown = await submit(uniqueEmail(), "anything");
  findUserByEmail.mockResolvedValue({ id: "u1", role: "customer", passwordHash: PASSWORD_HASH });
  const wrongPassword = await submit(uniqueEmail(), "anything");

  expect(unknown.error).toBe(wrongPassword.error);
});

test("a rate-limited login is reported, not thrown", async () => {
  const email = uniqueEmail();
  findUserByEmail.mockResolvedValue(null);

  // The limit is 10 per 15 minutes for one address from one IP.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const state = await submit(email, "wrong");
    expect(state.error).toBe("The email or password is not correct.");
  }

  const blocked = await submit(email, "wrong");

  expect(blocked.error).toBe("Too many login attempts. Please try again later.");
  expect(blocked.email).toBe(email);
});

test("a valid login succeeds once the rate-limit window has passed", async () => {
  const email = uniqueEmail();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-28T10:00:00Z"));

  findUserByEmail.mockResolvedValue(null);
  for (let attempt = 0; attempt < 11; attempt += 1) {
    await submit(email, "wrong");
  }
  expect((await submit(email, "wrong")).error).toBe("Too many login attempts. Please try again later.");

  vi.setSystemTime(new Date("2026-07-28T10:16:00Z"));
  findUserByEmail.mockResolvedValue({ id: "u9", role: "admin", passwordHash: PASSWORD_HASH });

  await expect(submit(email, PASSWORD)).rejects.toThrow("NEXT_REDIRECT");
  expect(setSessionCookie).toHaveBeenCalledWith("u9");
  expect(redirect).toHaveBeenCalledWith("/admin");
});

test("an unexpected server failure is generic and does not leak the cause", async () => {
  const email = uniqueEmail();
  findUserByEmail.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:5432"));

  const state = await submit(email, PASSWORD);

  expect(state.error).toBe("Something went wrong. Please try again.");
  expect(state.error).not.toContain("ECONNREFUSED");
  expect(state.email).toBe(email);
});

test("a successful login redirects by role and is never caught as an error", async () => {
  findUserByEmail.mockResolvedValue({ id: "u2", role: "customer", passwordHash: PASSWORD_HASH });

  await expect(submit(uniqueEmail(), PASSWORD)).rejects.toThrow("NEXT_REDIRECT");
  expect(redirect).toHaveBeenCalledWith("/account");
});
