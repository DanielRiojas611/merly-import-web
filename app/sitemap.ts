import type { MetadataRoute } from "next";
import type { Product } from "./catalogo/products";
import { getPublishedProductsByIds } from "./lib/neon-catalog";
import { SEO_PILOT_PRODUCT_IDS, productPath } from "./lib/product-seo";
import { siteUrl } from "./lib/site-url";

function lastUpdated() {
  const configured = process.env.SITE_LAST_UPDATED_AT?.trim();
  const parsed = configured ? new Date(configured) : new Date("2026-08-05T00:00:00.000Z");
  return Number.isNaN(parsed.getTime()) ? new Date("2026-08-05T00:00:00.000Z") : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const modified = lastUpdated();
  let products: Product[] = [];
  try {
    products = await getPublishedProductsByIds([...SEO_PILOT_PRODUCT_IDS]);
  } catch (error) {
    console.error("No se pudieron incluir productos en el sitemap", error);
  }

  return [
    { url: new URL("/", base).toString(), lastModified: modified, changeFrequency: "weekly", priority: 1 },
    { url: new URL("/catalogo", base).toString(), lastModified: modified, changeFrequency: "daily", priority: .9 },
    { url: new URL("/productos", base).toString(), lastModified: modified, changeFrequency: "weekly", priority: .8 },
    ...products.map((product) => ({
      url: new URL(productPath(product), base).toString(),
      lastModified: modified,
      changeFrequency: "weekly" as const,
      priority: .7,
    })),
    { url: new URL("/privacidad", base).toString(), lastModified: modified, changeFrequency: "yearly", priority: .2 },
  ];
}
