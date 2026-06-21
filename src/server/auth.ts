import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { findUserByEmail, findUserById } from "@/server/store";

const COOKIE_NAME = "easy_ecom_session";
const encoder = new TextEncoder();

function secretKey() {
  return encoder.encode(process.env.AUTH_SECRET || "dev-secret-change-me");
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "customer";
}

export async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = payload.sub;
    if (!userId) return null;
    const user = findUserById(userId);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    throw new Error("Unauthorized");
  }
  return user;
}

export function findDemoCredentials(email: string) {
  return findUserByEmail(email);
}
