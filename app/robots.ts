import type { MetadataRoute } from "next";
import { siteUrl } from "./lib/site-url";

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== "production") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/api/social-card"],
      disallow: ["/admin/", "/control", "/login", "/api/"],
    }],
    sitemap: new URL("/sitemap.xml", siteUrl()).toString(),
  };
}
