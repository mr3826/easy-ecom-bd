import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { getPrisma } from "@/server/db";

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

async function getSessionUserByToken(token: string) {
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
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    createdAt: user.createdAt,
  } satisfies SessionUser;
}

export async function createSession(userId: string) {
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
    const prisma = getPrisma();
    await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return getSessionUserByToken(token);
}

export async function getUserFromToken(token: string | null | undefined) {
  if (!token) return null;
  return getSessionUserByToken(token);
}

export async function requireAuth(roles?: Array<SessionUser["role"]>) {
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
