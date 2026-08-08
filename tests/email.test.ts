import { afterEach, beforeEach, expect, test, vi } from "vitest";

/*
Transport coverage for sendEmail, which nothing exercised before: SMTP has
never been configured on this deployment, so every send returned early and the
branch below it had never run anywhere.

On bundling — `await import("nodemailer")` looks like it would be missed by
file tracing, and .next/standalone/node_modules holds no nodemailer directory.
It is a false alarm: Turbopack inlines server dependencies into the SSR chunks
instead, verified by finding nodemailer's own package.json and smtp-transport
inlined in .next/server/chunks/ssr/. Neither the trace manifests nor
standalone/node_modules is where it lives, so do not "fix" the dynamic import
on the strength of those two being empty.
*/

const sendMail = vi.fn();
// Typed rather than given a named parameter: the mock needs a one-argument
// signature so the wrapper below type-checks, but binding that argument would
// leave it unused and trip no-unused-vars.
const createTransport = vi.fn<(options: unknown) => { sendMail: typeof sendMail }>(() => ({ sendMail }));
// Wrapped rather than passed directly: vi.mock factories are hoisted above the
// declarations above, so the reference has to be deferred to call time.
vi.mock("nodemailer", () => ({ default: { createTransport: (options: unknown) => createTransport(options) } }));

const SMTP_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "FROM_EMAIL", "FROM_NAME"] as const;
const ORIGINAL = Object.fromEntries(SMTP_KEYS.map((k) => [k, process.env[k]]));

function configure(overrides: Partial<Record<(typeof SMTP_KEYS)[number], string>> = {}) {
  const base = {
    SMTP_HOST: "mail.example.test",
    SMTP_PORT: "465",
    SMTP_USER: "noreply@example.test",
    SMTP_PASS: "hunter2hunter2",
  };
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    process.env[key] = value;
  }
}

const template = { subject: "Subject line", html: "<p>body</p>", text: "body" };

beforeEach(() => {
  for (const key of SMTP_KEYS) delete process.env[key];
  sendMail.mockReset().mockResolvedValue({ messageId: "<test>" });
  createTransport.mockClear();
});

afterEach(() => {
  for (const key of SMTP_KEYS) {
    if (ORIGINAL[key] === undefined) delete process.env[key];
    else process.env[key] = ORIGINAL[key];
  }
});

async function send(to = "customer@example.test") {
  const { sendEmail } = await import("@/server/email");
  return sendEmail(to, template);
}

test("an unconfigured mailer reports failure instead of attempting a send", async () => {
  // Production ran in exactly this state until now, so this is the branch that
  // must stay quiet and non-throwing rather than take down a checkout.
  const result = await send();

  expect(result).toEqual({ success: false, error: "SMTP not configured" });
  expect(createTransport).not.toHaveBeenCalled();
});

test("a partially configured mailer is treated as unconfigured", async () => {
  // A half-set SetEnv block is the likeliest misconfiguration on this host.
  configure();
  delete process.env.SMTP_PASS;

  const result = await send();

  expect(result.success).toBe(false);
  expect(createTransport).not.toHaveBeenCalled();
});

test("port 465 negotiates TLS from the start", async () => {
  // 465 is implicit TLS. Passing secure:false here would send the mailbox
  // password over an unencrypted socket before any STARTTLS upgrade.
  configure({ SMTP_PORT: "465" });

  await send();

  expect(createTransport).toHaveBeenCalledWith(
    expect.objectContaining({ host: "mail.example.test", port: 465, secure: true }),
  );
});

test("port 587 starts plaintext and upgrades", async () => {
  configure({ SMTP_PORT: "587" });

  await send();

  expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ port: 587, secure: false }));
});

test("the sender is the authenticated mailbox", async () => {
  // cPanel's Exim rejects or rewrites a From address the authenticated account
  // does not own, so a mismatch here shows up as silent non-delivery.
  configure({ FROM_EMAIL: "noreply@example.test", FROM_NAME: "Example Shop" });

  await send("customer@example.test");

  expect(sendMail).toHaveBeenCalledWith(
    expect.objectContaining({
      from: '"Example Shop" <noreply@example.test>',
      to: "customer@example.test",
      subject: "Subject line",
    }),
  );
});

test("a transport failure is reported, never thrown", async () => {
  // sendEmail is called from inside checkoutAction's try block. If a refused
  // SMTP connection propagated, a completed order would surface to the customer
  // as a failed checkout.
  configure();
  sendMail.mockRejectedValue(new Error("ECONNREFUSED"));

  const result = await send();

  expect(result.success).toBe(false);
  expect(result.error).toContain("ECONNREFUSED");
});
