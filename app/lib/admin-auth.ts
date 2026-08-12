import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "merly_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!value || value.length < 32) throw new Error("ADMIN_SESSION_SECRET_MISSING");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createAdminSession(username: string) {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${username}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export async function getAdminSession() {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [username, expiresText, signature] = raw.split(".");
  const expires = Number(expiresText);
  if (!username || !signature || !Number.isFinite(expires)) return null;
  if (expires < Math.floor(Date.now() / 1000)) return null;

  const configuredUser = process.env.ADMIN_USERNAME?.trim() ?? "";
  if (!configuredUser || !safeEqual(username, configuredUser)) return null;
  const payload = `${username}.${expires}`;
  if (!safeEqual(signature, sign(payload))) return null;
  return { username, expires };
}

export async function isAdminAuthenticated() {
  return Boolean(await getAdminSession());
}

export function adminCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export function validAdminCredentials(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!expectedUser || !expectedPassword) return false;
  return safeEqual(username, expectedUser) && safeEqual(password, expectedPassword);
}
