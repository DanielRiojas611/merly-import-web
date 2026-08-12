import { products as fallbackProducts, type Product } from "../../catalogo/products";
import { getCatalogCategories, getPublishedProductsByIds, getPublishedProductsPage, isCatalogDatabaseConfigured, type CatalogFilter } from "../../lib/neon-catalog";
import { comparableText, displayProductName, isOwnBrand, normalizeBrand, publicProductBadge, publicProductImage, productSemanticKey } from "../../lib/product-utils";

export const revalidate = 120;
function numberParam(value: string | null, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(0, Math.trunc(parsed))) : fallback;
}
function cleanCategory(value: string) { return value.replace(/\s+/g, " ").trim().slice(0, 60); }
function resolveFilter(value: string | null, categories: string[]): CatalogFilter {
  const requested = cleanCategory(value ?? "");
  if (!requested) return "Todos";
  if (["propias", "marca propia", "marcas propias"].includes(comparableText(requested))) return "Marcas propias";
  return categories.find((category) => comparableText(category) === comparableText(requested)) ?? "Todos";
}
function publicFallbackProducts() {
  const unique = new Map<string, Product>();
  for (const product of fallbackProducts) {
    const brand = normalizeBrand(product.brand);
    const ownBrand = isOwnBrand(brand, product.ownBrand);
    const normalized: Product = { ...product, brand, name: displayProductName(brand, product.name), ownBrand, image: publicProductImage(product.id, product.image), badge: publicProductBadge(product.badge, ownBrand) || undefined };
    const key = productSemanticKey(normalized); if (!unique.has(key)) unique.set(key, normalized);
  }
  return [...unique.values()].sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.brand.localeCompare(b.brand, "es") || a.name.localeCompare(b.name, "es"));
}
function fallbackCategories() { return [...new Set(publicFallbackProducts().map((product) => cleanCategory(product.category)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")); }
function fallbackPage(query: string, filter: CatalogFilter, limit: number, offset: number) {
  const term = comparableText(query);
  const filtered = publicFallbackProducts().filter((product) => {
    const matchesQuery = !term || comparableText(`${product.brand} ${product.name} ${product.description ?? ""} ${product.presentation} ${product.category}`).includes(term);
    const matchesFilter = filter === "Todos" || (filter === "Marcas propias" ? product.ownBrand : comparableText(product.category) === comparableText(filter));
    return matchesQuery && matchesFilter;
  });
  return { products: filtered.slice(offset, offset + limit), total: filtered.length };
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ids = [...new Set((url.searchParams.get("ids") ?? "").split(",").map((id) => id.trim()).filter((id) => /^[a-zA-Z0-9._-]{1,120}$/.test(id)))].slice(0, 100);
  if (ids.length) {
    try {
      const products = await getPublishedProductsByIds(ids);
      const resolved = products.length ? products : publicFallbackProducts().filter((product) => ids.includes(product.id));
      return Response.json({ products: resolved }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      console.error("Cart product reconciliation failed", error);
      return Response.json({ products: publicFallbackProducts().filter((product) => ids.includes(product.id)) }, { headers: { "Cache-Control": "private, no-store" } });
    }
  }
  const query = (url.searchParams.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
  const limit = Math.max(1, numberParam(url.searchParams.get("limit"), 24, 48));
  const offset = numberParam(url.searchParams.get("offset"), 0, 5_000);
  try {
    const categories = (await getCatalogCategories()) ?? fallbackCategories();
    const filter = resolveFilter(url.searchParams.get("filter"), categories);
    const databasePage = await getPublishedProductsPage({ query, filter, limit, offset });
    const page = databasePage ?? fallbackPage(query, filter, limit, offset);
    return Response.json({ ...page, categories, hasMore: offset + page.products.length < page.total }, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
  } catch (error) {
    console.error("Catalog database read failed", error);
    const categories = fallbackCategories();
    const filter = resolveFilter(url.searchParams.get("filter"), categories);
    const page = fallbackPage(query, filter, limit, offset);
    return Response.json({ ...page, categories, hasMore: offset + page.products.length < page.total, databaseConfigured: isCatalogDatabaseConfigured() }, { headers: { "Cache-Control": "no-store" } });
  }
}
