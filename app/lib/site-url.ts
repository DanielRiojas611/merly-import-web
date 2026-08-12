import { OFFICIAL_SITE_URL } from "./brand";

export function siteUrl() {
  if (process.env.VERCEL_ENV === "production") {
    return new URL(OFFICIAL_SITE_URL);
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured.startsWith("http") ? configured : `https://${configured}`);
    } catch {
      // Use the official public domain when the environment value is invalid.
    }
  }

  return new URL(OFFICIAL_SITE_URL);
}
