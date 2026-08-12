import { neon } from "@neondatabase/serverless";
import {
  getAdminProductsByIds,
  normalizePriceTiers,
  productImageStatus,
  productSalesUnit,
  writeProductAudit,
  type AdminProductInput,
} from "./admin-products";

export type ProductDraft = {
  id: string;
  payload: AdminProductInput;
  source: string;
  batchId: string | null;
  updatedAt: string;
};

function db() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL_MISSING");
  return neon(url);
}

function normalizedDraft(product: AdminProductInput): AdminProductInput {
  return {
    ...product,
    imageStatus: product.imageStatus ?? productImageStatus(product.imageUrl),
    salesUnit: product.salesUnit ?? productSalesUnit(product.presentation),
    tiers: normalizePriceTiers(product.tiers),
    internalReview: product.internalReview?.trim() || null,
  };
}

export async function listProductDrafts(): Promise<ProductDraft[]> {
  const rows = await db().query(`
    SELECT id, payload, source, batch_id AS "batchId", updated_at AS "updatedAt"
    FROM product_drafts ORDER BY updated_at DESC, id
  `);
  return (rows as unknown as ProductDraft[]).map((draft) => ({
    ...draft,
    payload: normalizedDraft(draft.payload),
  }));
}

export async function upsertProductDrafts(
  products: AdminProductInput[],
  source = "manual",
  batchId: string | null = null,
) {
  if (!products.length) return;
  const rows = products.map((product) => {
    const payload = normalizedDraft(product);
    return { id: payload.id, payload };
  });
  await db().query(
    `INSERT INTO product_drafts (id, payload, source, batch_id)
     SELECT item.id, item.payload, $2, NULLIF($3, '')
     FROM jsonb_to_recordset($1::jsonb) AS item(id text, payload jsonb)
     ON CONFLICT (id) DO UPDATE SET
       payload = EXCLUDED.payload, source = EXCLUDED.source,
       batch_id = EXCLUDED.batch_id, updated_at = NOW()`,
    [JSON.stringify(rows), source, batchId ?? ""],
  );
}

export async function deleteProductDraft(id: string) {
  await db().query(`DELETE FROM product_drafts WHERE id = $1`, [id]);
}

export async function publishProductDrafts(ids: string[], actor = "admin") {
  if (!ids.length) return [];
  const beforeRows = await getAdminProductsByIds(ids);
  const before = new Map(beforeRows.map((product) => [product.id, product]));

  const published = await db().query(
    `WITH selected AS (
       SELECT id, payload FROM product_drafts WHERE id = ANY($1::text[])
     ), upserted AS (
       INSERT INTO products (
         id, brand, name, description, presentation, category, own_brand,
         image_url, image_status, sales_unit, quote_only, badge, is_active,
         is_featured, sort_order, internal_note
       )
       SELECT
         id, payload->>'brand', payload->>'name', COALESCE(payload->>'description', ''),
         payload->>'presentation', payload->>'category',
         COALESCE((payload->>'ownBrand')::boolean, false),
         COALESCE(payload->>'imageUrl', ''),
         COALESCE(NULLIF(payload->>'imageStatus', ''),
           CASE
             WHEN COALESCE(payload->>'imageUrl', '') = '' OR COALESCE(payload->>'imageUrl', '') = '/products/product-placeholder.svg' THEN 'pending'
             WHEN COALESCE(payload->>'imageUrl', '') LIKE '/products/recovered/%' THEN 'recovered'
             ELSE 'approved'
           END),
         COALESCE(NULLIF(payload->>'salesUnit', ''), 'otro'),
         COALESCE((payload->>'quoteOnly')::boolean, true),
         NULLIF(payload->>'badge', ''),
         COALESCE((payload->>'isActive')::boolean, true),
         COALESCE((payload->>'isFeatured')::boolean, false),
         COALESCE((payload->>'sortOrder')::integer, 0),
         NULLIF(payload->>'internalReview', '')
       FROM selected
       ON CONFLICT (id) DO UPDATE SET
         brand=EXCLUDED.brand, name=EXCLUDED.name, description=EXCLUDED.description,
         presentation=EXCLUDED.presentation, category=EXCLUDED.category,
         own_brand=EXCLUDED.own_brand, image_url=EXCLUDED.image_url,
         image_status=EXCLUDED.image_status, sales_unit=EXCLUDED.sales_unit,
         quote_only=EXCLUDED.quote_only, badge=EXCLUDED.badge,
         is_active=EXCLUDED.is_active, is_featured=EXCLUDED.is_featured,
         sort_order=EXCLUDED.sort_order, internal_note=EXCLUDED.internal_note,
         updated_at=NOW()
       RETURNING id
     ), deleted_tiers AS (
       DELETE FROM product_price_tiers
       WHERE product_id IN (SELECT id FROM upserted)
       RETURNING id
     ), inserted_tiers AS (
       INSERT INTO product_price_tiers (product_id, min_quantity, unit_price)
       SELECT selected.id, tier.min, tier.price
       FROM selected
       JOIN upserted ON upserted.id = selected.id
       CROSS JOIN LATERAL jsonb_to_recordset(COALESCE(selected.payload->'tiers', '[]'::jsonb))
         AS tier(min integer, price numeric)
       WHERE tier.min > 0 AND tier.price > 0
         AND (SELECT COUNT(*) FROM deleted_tiers) >= 0
       RETURNING id
     ), removed AS (
       DELETE FROM product_drafts
       WHERE id IN (SELECT id FROM upserted)
         AND (SELECT COUNT(*) FROM deleted_tiers) >= 0
         AND (SELECT COUNT(*) FROM inserted_tiers) >= 0
       RETURNING id
     )
     SELECT id FROM removed ORDER BY id`,
    [ids],
  ) as Array<{ id: string }>;

  const publishedIds = published.map((row) => row.id);
  const afterRows = await getAdminProductsByIds(publishedIds);
  await Promise.all(afterRows.map((product) => writeProductAudit(
    product.id,
    before.has(product.id) ? "publish-update" : "publish-create",
    actor,
    before.get(product.id) ?? null,
    product,
  )));
  return published;
}
