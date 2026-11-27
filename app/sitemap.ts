import type { MetadataRoute } from "next";
import type { Product } from "./catalogo/products";
import { getPublishedProducts } from "./lib/neon-catalog";
import { productPath } from "./lib/product-seo";
import { activeSeoGroups } from "./lib/seo-groups";
import { siteUrl } from "./lib/site-url";

function lastUpdated() {
  const configured = process.env.SITE_LAST_UPDATED_AT?.trim();
  const parsed = configured ? new Date(configured) : new Date("2026-08-05T00:00:00.000Z");
  return Number.isNaN(parsed.getTime()) ? new Date("2026-08-05T00:00:00.000Z") : parsed;
}

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const modified = lastUpdated();
  let products: Product[] = [];
  try {
    products = (await getPublishedProducts()) ?? [];
  } catch (error) {
    console.error("No se pudieron incluir productos en el sitemap", error);
  }

  return [
    { url: new URL("/", base).toString(), lastModified: modified, changeFrequency: "weekly", priority: 1 },
    { url: new URL("/catalogo", base).toString(), lastModified: modified, changeFrequency: "daily", priority: .9 },
    { url: new URL("/productos", base).toString(), lastModified: modified, changeFrequency: "weekly", priority: .8 },
    ...[...new Map(products.map((product) => [product.id, product])).values()].map((product) => ({
      url: new URL(productPath(product), base).toString(),
      lastModified: modified,
      changeFrequency: "weekly" as const,
      priority: .7,
    })),
    ...activeSeoGroups(products).map(group => ({ url: new URL(group.path, base).toString() })),
    { url: new URL("/distribuidor", base).toString() },
    { url: new URL("/privacidad", base).toString(), lastModified: modified, changeFrequency: "yearly", priority: .2 },
  ];
}
