import { randomBytes, createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getPrisma, isDatabaseConfigured } from "@/server/db";
import { findUserById } from "@/server/store";

const COOKIE_NAME = "easy_ecom_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin" | "super_admin";
  phone?: string | null;
  createdAt: Date;
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function makeToken() {
  return randomBytes(32).toString("hex");
}

function toSessionUser(user: {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin" | "super_admin";
  phone?: string | null;
  createdAt: string | Date;
}): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    createdAt: user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt),
  };
}

function getDemoSessionSecret() {
  return process.env.AUTH_SECRET || "easy-ecom-demo-session";
}

function signDemoPayload(payload: string) {
  return createHmac("sha256", getDemoSessionSecret()).update(payload).digest("base64url");
}

function verifyDemoSignature(payload: string, signature: string) {
  const expected = signDemoPayload(payload);
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(signature);
  return expectedBytes.length === signatureBytes.length && timingSafeEqual(expectedBytes, signatureBytes);
}

function encodeDemoSession(user: SessionUser) {
  const payload = Buffer.from(
    JSON.stringify({
      user,
      expiresAt: Date.now() + SESSION_TTL_MS,
    }),
  ).toString("base64url");
  return `demo.${payload}.${signDemoPayload(payload)}`;
}

function decodeDemoSession(token: string) {
  try {
    const [prefix, payload, signature] = token.split(".");
    if (prefix !== "demo" || !payload || !signature || !verifyDemoSignature(payload, signature)) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      user: SessionUser;
      expiresAt: number;
    };
    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) {
      return null;
    }
    return toSessionUser(parsed.user);
  } catch {
    return null;
  }
}

async function getSessionUserByToken(token: string) {
  if (!isDatabaseConfigured()) {
    return decodeDemoSession(token);
  }

  const prisma = getPrisma();
  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  const user = session.user;
  return toSessionUser(user);
}

async function createSession(userId: string) {
  if (!isDatabaseConfigured()) {
    const user = await findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return encodeDemoSession(toSessionUser(user));
  }

  const prisma = getPrisma();
  const token = makeToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return token;
}

export async function setSessionCookie(userId: string) {
  const token = await createSession(userId);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    if (isDatabaseConfigured()) {
      const prisma = getPrisma();
      await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
    } else {
      decodeDemoSession(token);
    }
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return getSessionUserByToken(token);
}

async function requireAuth(roles?: Array<SessionUser["role"]>) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  if (roles && !roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function requireAdmin() {
  return requireAuth(["admin", "super_admin"]);
}

export function getPostLoginRedirectPath(role: SessionUser["role"]) {
  return role === "admin" || role === "super_admin" ? "/admin" : "/account";
}

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60;
const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(email: string) {
  if (!isDatabaseConfigured()) {
    return makeToken();
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return null;
  }

  const token = makeToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });
  return token;
}

export async function consumePasswordResetToken(token: string) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const prisma = getPrisma();
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.expiresAt.getTime() < Date.now()) {
    if (record) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => {});
    }
    return null;
  }

  await prisma.passwordResetToken.delete({ where: { id: record.id } });
  return record.user;
}

export async function createEmailVerificationToken(userId: string) {
  if (!isDatabaseConfigured()) {
    return makeToken();
  }

  const prisma = getPrisma();
  const token = makeToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    },
  });
  return token;
}

export async function consumeEmailVerificationToken(token: string) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const prisma = getPrisma();
  const tokenHash = hashToken(token);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.expiresAt.getTime() < Date.now()) {
    if (record) {
      await prisma.emailVerificationToken.delete({ where: { id: record.id } }).catch(() => {});
    }
    return null;
  }

  await prisma.emailVerificationToken.delete({ where: { id: record.id } });
  return record.user;
}

export async function markEmailVerified(userId: string) {
  if (!isDatabaseConfigured()) {
    return;
  }

  const prisma = getPrisma();
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true, emailVerifiedAt: new Date() },
  });
}


