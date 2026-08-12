import { NextResponse } from "next/server";

export const adminNoStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export function adminJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: adminNoStoreHeaders });
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export function isJsonMutation(request: Request, maximumBytes = 6_000_000) {
  if (!isSameOrigin(request)) return false;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return false;
  const length = Number(request.headers.get("content-length") ?? 0);
  return !Number.isFinite(length) || length <= maximumBytes;
}

export function isFormMutation(request: Request, maximumBytes = 32_000) {
  if (!isSameOrigin(request)) return false;
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/x-www-form-urlencoded") && !contentType.startsWith("multipart/form-data")) return false;
  const length = Number(request.headers.get("content-length") ?? 0);
  return !Number.isFinite(length) || length <= maximumBytes;
}

export function adminRedirect(path: string, request: Request, status = 303) {
  const response = NextResponse.redirect(new URL(path, request.url), status);
  for (const [key, value] of Object.entries(adminNoStoreHeaders)) response.headers.set(key, value);
  return response;
}
