import { neon } from "@neondatabase/serverless";

export type ProductImageStatus = "pending" | "recovered" | "approved";
export type ProductSalesUnit =
  | "caja"
  | "unidad"
  | "docena"
  | "exhibidor"
  | "paquete"
  | "blister"
  | "kilogramo"
  | "otro";

export type ProductPriceTier = {
  min: number;
  price: number;
};

export type AdminProductInput = {
  id: string;
  brand: string;
  name: string;
  description: string;
  presentation: string;
  category: string;
  ownBrand: boolean;
  imageUrl: string;
  imageStatus?: ProductImageStatus;
  salesUnit?: ProductSalesUnit;
  quoteOnly: boolean;
  tiers?: ProductPriceTier[];
  badge: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  internalReview?: string | null;
};

export type ProductAuditEntry = {
  id: number;
  productId: string;
  action: string;
  actor: string;
  beforeData: AdminProductInput | null;
  afterData: AdminProductInput | null;
  createdAt: string;
};

function db() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL_MISSING");
  return neon(url);
}

export function normalizePriceTiers(value: unknown): ProductPriceTier[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<number, number>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const tier = item as { min?: unknown; price?: unknown };
    const min = Math.trunc(Number(tier.min));
    const price = Number(tier.price);
    if (!Number.isFinite(min) || min <= 0 || !Number.isFinite(price) || price <= 0) continue;
    unique.set(min, Math.round(price * 100) / 100);
  }
  return [...unique.entries()].map(([min, price]) => ({ min, price })).sort((a, b) => a.min - b.min);
}

const selectColumns = `
  id, brand, name, description, presentation, category,
  own_brand AS "ownBrand", image_url AS "imageUrl",
  image_status AS "imageStatus", sales_unit AS "salesUnit",
  quote_only AS "quoteOnly", badge,
  is_active AS "isActive", is_featured AS "isFeatured",
  sort_order AS "sortOrder", internal_note AS "internalReview",
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object('min', tier.min_quantity, 'price', tier.unit_price) ORDER BY tier.min_quantity)
    FROM product_price_tiers tier WHERE tier.product_id = products.id
  ), '[]'::jsonb) AS tiers`;

export function productImageStatus(imageUrl: string): ProductImageStatus {
  const value = imageUrl.trim();
  if (!value || value === "/products/product-placeholder.svg" || value.startsWith("data:image/svg+xml")) return "pending";
  if (value.startsWith("/products/recovered/") || /^data:image\/(?:webp|png|jpe?g);base64,/i.test(value)) return "recovered";
  return "approved";
}

export function productSalesUnit(presentation: string): ProductSalesUnit {
  const value = presentation.toUpperCase();
  if (value.includes("DOC")) return "docena";
  if (value.includes("BLISTER")) return "blister";
  if (value.includes("KG")) return "kilogramo";
  if (value.includes("BOX") || value.includes("EXHIB")) return "exhibidor";
  if (value.includes("PAQ")) return "paquete";
  if (value.includes("UND") || value.includes("UNIDAD")) return "unidad";
  if (value.startsWith("CAJA")) return "caja";
  return "otro";
}

export async function listAdminProducts(): Promise<AdminProductInput[]> {
  const rows = await db().query(`SELECT ${selectColumns} FROM products ORDER BY sort_order, brand, name, id`);
  return rows as unknown as AdminProductInput[];
}

export async function getAdminProduct(id: string): Promise<AdminProductInput | null> {
  const rows = await db().query(`SELECT ${selectColumns} FROM products WHERE id=$1 LIMIT 1`, [id]);
  return (rows[0] as unknown as AdminProductInput | undefined) ?? null;
}

export async function getAdminProductsByIds(ids: string[]): Promise<AdminProductInput[]> {
  if (!ids.length) return [];
  const rows = await db().query(`SELECT ${selectColumns} FROM products WHERE id = ANY($1::text[])`, [ids]);
  return rows as unknown as AdminProductInput[];
}

export async function createAdminProduct(product: AdminProductInput) {
  const tiers = normalizePriceTiers(product.tiers);
  await db().query(
    `WITH inserted AS (
      INSERT INTO products (
        id, brand, name, description, presentation, category, own_brand,
        image_url, image_status, sales_unit, quote_only, badge, is_active,
        is_featured, sort_order, internal_note
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING id
    ), cleared AS (
      DELETE FROM product_price_tiers WHERE product_id = (SELECT id FROM inserted) RETURNING id
    ), inserted_tiers AS (
      INSERT INTO product_price_tiers (product_id, min_quantity, unit_price)
      SELECT inserted.id, tier.min, tier.price
      FROM inserted
      CROSS JOIN LATERAL jsonb_to_recordset($17::jsonb) AS tier(min integer, price numeric)
      WHERE (SELECT COUNT(*) FROM cleared) >= 0
      RETURNING id
    )
    SELECT inserted.id,
      (SELECT COUNT(*) FROM cleared) AS cleared_count,
      (SELECT COUNT(*) FROM inserted_tiers) AS tier_count
    FROM inserted`,
    [product.id, product.brand, product.name, product.description, product.presentation,
      product.category, product.ownBrand, product.imageUrl,
      product.imageStatus ?? productImageStatus(product.imageUrl),
      product.salesUnit ?? productSalesUnit(product.presentation), product.quoteOnly,
      product.badge, product.isActive, product.isFeatured, product.sortOrder,
      product.internalReview?.trim() || null, JSON.stringify(tiers)],
  );
}

export async function updateAdminProduct(id: string, product: AdminProductInput) {
  const tiers = normalizePriceTiers(product.tiers);
  await db().query(
    `WITH updated AS (
      UPDATE products SET
        brand=$2, name=$3, description=$4, presentation=$5, category=$6,
        own_brand=$7, image_url=$8, image_status=$9, sales_unit=$10,
        quote_only=$11, badge=$12, is_active=$13, is_featured=$14,
        sort_order=$15, internal_note=$16, updated_at=NOW()
      WHERE id=$1 RETURNING id
    ), cleared AS (
      DELETE FROM product_price_tiers WHERE product_id = (SELECT id FROM updated) RETURNING id
    ), inserted_tiers AS (
      INSERT INTO product_price_tiers (product_id, min_quantity, unit_price)
      SELECT updated.id, tier.min, tier.price
      FROM updated
      CROSS JOIN LATERAL jsonb_to_recordset($17::jsonb) AS tier(min integer, price numeric)
      WHERE (SELECT COUNT(*) FROM cleared) >= 0
      RETURNING id
    )
    SELECT updated.id,
      (SELECT COUNT(*) FROM cleared) AS cleared_count,
      (SELECT COUNT(*) FROM inserted_tiers) AS tier_count
    FROM updated`,
    [id, product.brand, product.name, product.description, product.presentation,
      product.category, product.ownBrand, product.imageUrl,
      product.imageStatus ?? productImageStatus(product.imageUrl),
      product.salesUnit ?? productSalesUnit(product.presentation), product.quoteOnly,
      product.badge, product.isActive, product.isFeatured, product.sortOrder,
      product.internalReview?.trim() || null, JSON.stringify(tiers)],
  );
}

export async function writeProductAudit(productId: string, action: string, actor: string, beforeData: AdminProductInput | null, afterData: AdminProductInput | null) {
  await db().query(
    `INSERT INTO product_audit_log (product_id, action, actor, before_data, after_data)
     VALUES ($1,$2,$3,$4::jsonb,$5::jsonb)`,
    [productId, action, actor || "admin", beforeData ? JSON.stringify(beforeData) : null, afterData ? JSON.stringify(afterData) : null],
  );
}

export async function setAdminProductActive(id: string, isActive: boolean, actor = "admin") {
  const before = await getAdminProduct(id);
  if (!before) throw new Error("PRODUCT_NOT_FOUND");
  await db().query(`UPDATE products SET is_active=$2, updated_at=NOW() WHERE id=$1`, [id, isActive]);
  const after = await getAdminProduct(id);
  await writeProductAudit(id, isActive ? "activate" : "deactivate", actor, before, after);
}

export async function listProductHistory(id: string): Promise<ProductAuditEntry[]> {
  const rows = await db().query(
    `SELECT id, product_id AS "productId", action, actor,
       before_data AS "beforeData", after_data AS "afterData", created_at AS "createdAt"
     FROM product_audit_log WHERE product_id=$1 ORDER BY created_at DESC, id DESC LIMIT 30`,
    [id],
  );
  return rows as unknown as ProductAuditEntry[];
}

export async function restoreProductFromHistory(productId: string, auditId: number, actor = "admin") {
  const rows = await db().query(
    `SELECT after_data AS snapshot FROM product_audit_log WHERE id=$1 AND product_id=$2 LIMIT 1`,
    [auditId, productId],
  );
  const snapshot = (rows[0] as { snapshot?: AdminProductInput | null } | undefined)?.snapshot;
  if (!snapshot) throw new Error("AUDIT_SNAPSHOT_NOT_FOUND");
  const before = await getAdminProduct(productId);
  const restored = { ...snapshot, id: productId, tiers: normalizePriceTiers(snapshot.tiers) };
  if (before) await updateAdminProduct(productId, restored);
  else await createAdminProduct(restored);
  const after = await getAdminProduct(productId);
  await writeProductAudit(productId, "restore", actor, before, after);
  return after;
}
