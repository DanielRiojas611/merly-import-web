import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/admin-auth";
import { listProductDrafts, upsertProductDrafts } from "../../../lib/admin-drafts";
import { normalizePriceTiers, type AdminProductInput, type ProductPriceTier } from "../../../lib/admin-products";
import { persistAdminImage } from "../../../lib/blob-images";

const INTERNAL_BRANDS = new Set(["POR VALIDAR", "REVISION_MANUAL", "REVISIÓN MANUAL", "VALIDAR", "PENDIENTE"]);
const noStore = { "Cache-Control": "no-store" };
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: noStore }); }
function validRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return false;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return false;
  const length = Number(request.headers.get("content-length") ?? 0);
  return !Number.isFinite(length) || length <= 6_000_000;
}
function validImage(value: string) { return !value || value.startsWith("/") || value.startsWith("https://") || /^data:image\/(?:jpeg|png|webp);base64,/i.test(value); }
function validRawTiers(value: unknown) {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length > 20) return false;
  const quantities = new Set<number>();
  for (const item of value) {
    if (!item || typeof item !== "object") return false;
    const tier = item as { min?: unknown; price?: unknown };
    const min = Number(tier.min);
    const price = Number(tier.price);
    if (!Number.isInteger(min) || min <= 0 || !Number.isFinite(price) || price <= 0 || price > 1_000_000 || quantities.has(min)) return false;
    quantities.add(min);
  }
  return true;
}
function pricesAreNonIncreasing(tiers: ProductPriceTier[]) {
  return tiers.every((tier, index) => index === 0 || tier.price <= tiers[index - 1].price);
}
function normalizeProduct(product: AdminProductInput): AdminProductInput {
  const rawBrand = product.brand?.trim() ?? "";
  const hiddenBrand = INTERNAL_BRANDS.has(rawBrand.toUpperCase());
  return {
    ...product, id: product.id?.trim() ?? "", brand: hiddenBrand ? "" : rawBrand,
    name: product.name?.trim() ?? "", description: product.description?.trim() ?? "",
    presentation: product.presentation?.trim() ?? "",
    category: product.category?.replace(/\s+/g, " ").trim().slice(0, 60) ?? "",
    imageUrl: product.imageUrl?.trim() ?? "", badge: product.badge?.trim() || null,
    internalReview: product.internalReview?.trim() || (hiddenBrand ? "Marca comercial pendiente de confirmación." : null),
    sortOrder: Math.trunc(Number(product.sortOrder) || 0),
    tiers: normalizePriceTiers(product.tiers),
  };
}
function validProduct(product: AdminProductInput) {
  const tiers = normalizePriceTiers(product.tiers);
  return Boolean(product && /^[a-z0-9][a-z0-9._-]{0,119}$/.test(product.id) &&
    product.name?.trim() && product.presentation?.trim() && product.category?.trim() && product.category.trim().length <= 60 &&
    ["pending", "recovered", "approved"].includes(product.imageStatus ?? "pending") &&
    ["caja", "unidad", "docena", "exhibidor", "paquete", "blister", "kilogramo", "otro"].includes(product.salesUnit ?? "otro") &&
    validImage(product.imageUrl) && pricesAreNonIncreasing(tiers) && (product.quoteOnly || tiers.length > 0));
}
export async function GET() {
  if (!(await getAdminSession())) return json({ error: "unauthorized" }, 401);
  return json({ drafts: await listProductDrafts() });
}
export async function POST(request: Request) {
  if (!(await getAdminSession())) return json({ error: "unauthorized" }, 401);
  if (!validRequest(request)) return json({ error: "invalid_request" }, 400);
  try {
    const body = await request.json() as { products?: AdminProductInput[]; source?: string; batchId?: string | null };
    const rawProducts = Array.isArray(body.products) ? body.products.slice(0, 500) : [];
    if (!rawProducts.length || rawProducts.some((product) => !validRawTiers(product.tiers))) return json({ error: "invalid_prices" }, 400);
    const normalized = rawProducts.map(normalizeProduct);
    const ids = normalized.map((product) => product.id);
    if (normalized.some((product) => !validProduct(product)) || new Set(ids).size !== ids.length) return json({ error: "invalid_products" }, 400);
    const products = await Promise.all(normalized.map(async (product) => ({ ...product, imageUrl: await persistAdminImage(product.imageUrl, "products", `${product.id}-${product.brand}-${product.name}`) })));
    await upsertProductDrafts(products, body.source?.trim().slice(0, 40) || "manual", body.batchId?.trim().slice(0, 100) || null);
    return json({ ok: true, count: products.length }, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "draft_save_failed";
    console.error("No se pudo guardar el borrador del producto", { code });
    if (code === "BLOB_STORAGE_NOT_CONFIGURED") return json({ error: code }, 503);
    if (code === "BLOB_IMAGE_SIZE_INVALID") return json({ error: code }, 413);
    return json({ error: "draft_save_failed" }, 500);
  }
}
