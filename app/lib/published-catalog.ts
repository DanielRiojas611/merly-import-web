import type { Product } from "../catalogo/products";
import bundled from "../catalogo/published-products.json";

export const CATALOG_SNAPSHOT_TAG = "merly-published-catalog";
export const CATALOG_SNAPSHOT_PATH = "catalog/published-v1.json";
export const CATALOG_SNAPSHOT_URL = "https://02kovfmaet388lvm.public.blob.vercel-storage.com/catalog/published-v1.json";

export function validatePublishedCatalog(value: unknown): Product[] | null {
  if (!value || typeof value !== "object") return null;
  const products = (value as { products?: unknown }).products;
  if (!Array.isArray(products) || products.length > 5000) return null;
  const ids = new Set<string>();
  for (const product of products) {
    if (!product || typeof product !== "object" || !/^[a-zA-Z0-9._-]{1,120}$/.test(product.id)
      || ids.has(product.id) || !["brand", "name", "presentation", "category", "image"].every((key) => typeof product[key] === "string")
      || !product.name.trim() || !product.category.trim() || !Array.isArray(product.tiers)) return null;
    ids.add(product.id);
  }
  return products as Product[];
}

export async function readPublishedCatalog(): Promise<Product[]> {
  try {
    const response = await fetch(CATALOG_SNAPSHOT_URL, { next: { revalidate: 60, tags: [CATALOG_SNAPSHOT_TAG] }, signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      const products = validatePublishedCatalog(await response.json());
      if (products) return products;
    }
  } catch (error) { console.error("Published catalog snapshot unavailable", error); }
  return bundled.products as Product[];
}
