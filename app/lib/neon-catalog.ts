import { readPublishedCatalog } from "./published-catalog";
import { neon } from "@neondatabase/serverless";
import type { Product, ProductSalesUnit, ProductTier } from "../catalogo/products";
import { comparableText, displayProductPresentation, isOwnBrand, isPublicProductComplete, normalizeBrand, publicProductBadge, publicProductImage } from "./product-utils";

export type CatalogFilter = string;
export type CatalogPage = { products: Product[]; total: number };

type ProductRow = {
  id: string; brand: string; name: string; description: string | null; presentation: string;
  category: string; ownBrand: boolean; image: string | null; salesUnit: string | null;
  quoteOnly: boolean; badge: string | null; isFeatured: boolean; sortOrder: number;
  tiers: Array<{ min: number | string; price: number | string }> | null; total?: number | string;
};

const salesUnits = new Set<ProductSalesUnit>(["caja", "unidad", "docena", "exhibidor", "paquete", "blister", "kilogramo", "otro"]);
const ownBrandNames = ["UTIL", "TOÑITO", "PIBE", "PROMIL", "HICELL", "MERLY", "MERLITA"];
const QUERY_TIMEOUT_MS = 6_000;

function connectionString() {
  const value = process.env.DATABASE_URL?.trim() || null;
  if (!value) return null;
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("DATABASE_URL_INVALID_FORMAT"); }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("DATABASE_URL_INVALID_FORMAT");
  return value;
}
function withTimeout<T>(promise: Promise<T>, timeout = QUERY_TIMEOUT_MS): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("CATALOG_QUERY_TIMEOUT")), timeout))]);
}
function normalizeLimit(value: number) { return Math.min(48, Math.max(1, Math.trunc(value || 24))); }
function normalizeOffset(value: number) { return Math.min(5_000, Math.max(0, Math.trunc(value || 0))); }
function normalizeCategory(value: unknown) { return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 60); }
function normalizeFilter(value: CatalogFilter | string | undefined): CatalogFilter {
  if (value === "Marcas propias") return value;
  const category = normalizeCategory(value);
  return category || "Todos";
}
function mapRow(row: ProductRow): Product | null {
  const category = normalizeCategory(row.category);
  if (!category) return null;
  const brand = normalizeBrand(row.brand);
  const ownBrand = isOwnBrand(brand, row.ownBrand);
  const salesUnit = salesUnits.has(row.salesUnit as ProductSalesUnit) ? row.salesUnit as ProductSalesUnit : "otro";
  const product: Product = {
    id: row.id, brand, name: row.name.trim(), description: row.description?.trim() || undefined,
    presentation: displayProductPresentation(row.presentation), category, ownBrand, image: publicProductImage(row.id, row.image),
    salesUnit, quoteOnly: row.quoteOnly, badge: publicProductBadge(row.badge, ownBrand) || undefined,
    isFeatured: row.isFeatured, sortOrder: Number(row.sortOrder) || 0,
    tiers: (row.tiers ?? []).map<ProductTier>((tier) => ({ min: Number(tier.min), price: Number(tier.price) }))
      .filter((tier) => Number.isFinite(tier.min) && Number.isFinite(tier.price) && tier.min > 0 && tier.price >= 0)
      .sort((a, b) => a.min - b.min),
  };
  return isPublicProductComplete(product) ? product : null;
}

const productSelect = `
  r.id, r.brand, r.name, r.description, r.presentation, r.category,
  r.own_brand AS "ownBrand", r.image_url AS image, r.sales_unit AS "salesUnit",
  r.quote_only AS "quoteOnly", r.badge, r.is_featured AS "isFeatured",
  r.sort_order AS "sortOrder",
  COALESCE((SELECT jsonb_agg(jsonb_build_object('min', t.min_quantity, 'price', t.unit_price)
    ORDER BY t.min_quantity) FROM product_price_tiers t WHERE t.product_id = r.id), '[]'::jsonb) AS tiers`;
const rankedProducts = `WITH ranked AS (
  SELECT p.*, ROW_NUMBER() OVER (
    PARTITION BY regexp_replace(upper(trim(p.brand)), '\\s+(33|34)$', ''), lower(trim(p.name)), lower(trim(p.presentation))
    ORDER BY p.is_featured DESC,
      CASE WHEN COALESCE(p.image_url, '') = '' OR COALESCE(p.image_url, '') = '/products/product-placeholder.svg' THEN 1 ELSE 0 END,
      p.sort_order, p.updated_at DESC, p.id
  ) AS duplicate_rank
  FROM products p
  WHERE p.is_active = TRUE
    AND lower(concat_ws(' ', p.name, p.description, p.presentation)) NOT LIKE '%por confirmar%'
    AND lower(concat_ws(' ', p.name, p.description, p.presentation)) NOT LIKE '%pendiente de confirmar%'
)`;

export function isCatalogDatabaseConfigured() { return Boolean(process.env.DATABASE_URL?.trim()); }
export function catalogDatabaseErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/exceeded.*quota|quota.*exceeded|HTTP status 402/i.test(message)) return "quota-exceeded";
  if (message.includes("DATABASE_URL_INVALID_FORMAT")) return "invalid-format";
  if (/password authentication|authentication failed|28P01/i.test(message)) return "credentials";
  if (/fetch failed|ENOTFOUND|ECONN|timeout|network/i.test(message)) return "network";
  return "unreachable";
}
export async function getCatalogCategories(): Promise<string[] | null> {
  return [...new Set((await readPublishedCatalog()).map(p => normalizeCategory(p.category)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}
export async function getPublishedProductsPage({ limit = 24, offset = 0, query = "", filter = "Todos", databaseOnly = false }: { limit?: number; offset?: number; query?: string; filter?: CatalogFilter | string; databaseOnly?: boolean } = {}): Promise<CatalogPage | null> {
  if (!databaseOnly) {
    const term = comparableText(query).slice(0, 100);
    const chosen = normalizeFilter(filter);
    const products = (await readPublishedCatalog()).filter(p => (!term || comparableText(`${p.brand} ${p.name} ${p.description ?? ""} ${p.presentation} ${p.category}`).includes(term)) && (chosen === "Todos" || (chosen === "Marcas propias" ? p.ownBrand : comparableText(p.category) === comparableText(chosen))));
    return { products: products.slice(normalizeOffset(offset), normalizeOffset(offset) + normalizeLimit(limit)), total: products.length };
  }
  const url = connectionString();
  if (!url) return null;
  const safeLimit = normalizeLimit(limit);
  const safeOffset = normalizeOffset(offset);
  const safeQuery = comparableText(query).slice(0, 100);
  const safeFilter = normalizeFilter(filter);
  const rows = await withTimeout(neon(url).query(
    `${rankedProducts}, filtered AS (
      SELECT * FROM ranked r WHERE r.duplicate_rank = 1
        AND ($3 = '' OR position($3 in translate(lower(concat_ws(' ', r.brand, r.name, r.description, r.presentation, r.category)), 'áéíóúüñ', 'aeiouun')) > 0)
        AND ($4 = 'Todos' OR ($4 = 'Marcas propias' AND (r.own_brand = TRUE OR regexp_replace(upper(trim(r.brand)), '\\s+(33|34)$', '') = ANY($5::text[]))) OR r.category = $4)
    )
    SELECT ${productSelect}, COUNT(*) OVER() AS total FROM filtered r
    ORDER BY r.is_featured DESC, r.sort_order, r.brand, r.name, r.id LIMIT $1 OFFSET $2`,
    [safeLimit, safeOffset, safeQuery, safeFilter, ownBrandNames],
  ) as unknown as Promise<ProductRow[]>);
  return { products: rows.map(mapRow).filter((product): product is Product => Boolean(product)), total: rows.length ? Number(rows[0].total) || 0 : 0 };
}
export async function getDatabasePublishedCatalog(): Promise<Product[]> {
  const url = connectionString();
  if (!url) throw new Error("CATALOG_DATABASE_UNAVAILABLE");
  const rows = await withTimeout(neon(url).query(
    `${rankedProducts} SELECT ${productSelect} FROM ranked r WHERE r.duplicate_rank=1
     ORDER BY r.is_featured DESC, r.sort_order, r.brand, r.name, r.id`,
  ) as unknown as Promise<ProductRow[]>);
  const products = rows.map(mapRow).filter((p): p is Product => Boolean(p));
  if (rows.length > 5000 || products.length !== rows.length) throw new Error("CATALOG_SNAPSHOT_INCOMPLETE");
  return products;
}
export async function getPublishedProductsByIds(ids: string[]): Promise<Product[]> {
  const safeIds = [...new Set(ids.filter(id => /^[a-zA-Z0-9._-]{1,120}$/.test(id)))].slice(0, 100);
  const products = new Map((await readPublishedCatalog()).map(p => [p.id, p]));
  return safeIds.flatMap(id => products.has(id) ? [products.get(id)!] : []);
}
export async function getPublishedProducts(): Promise<Product[] | null> { return readPublishedCatalog(); }
export async function getFeaturedProducts(limit = 5): Promise<Product[] | null> {
  return [...await readPublishedCatalog()].sort((a,b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) || Number(b.ownBrand) - Number(a.ownBrand) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.brand.localeCompare(b.brand, "es") || a.name.localeCompare(b.name, "es")).slice(0, Math.min(12, Math.max(1, Math.trunc(limit))));
}
export async function pingCatalogDatabase() {
  const url = connectionString();
  if (!url) return { configured: false, reachable: false } as const;
  await withTimeout(neon(url)`SELECT 1`, 4_000);
  return { configured: true, reachable: true } as const;
}
