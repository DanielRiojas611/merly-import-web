import { neon } from "@neondatabase/serverless";

const sourceUrl = process.env.SOURCE_DATABASE_URL?.trim();
const targetUrl = process.env.DATABASE_URL?.trim();
const confirmedTarget = process.env.CONFIRM_TARGET_PROJECT?.trim();
const MERLY_PROJECT_ID = "solitary-recipe-80594074";

if (!sourceUrl) throw new Error("SOURCE_DATABASE_URL_MISSING");
if (!targetUrl) throw new Error("DATABASE_URL_MISSING");
if (sourceUrl === targetUrl) throw new Error("SOURCE_AND_TARGET_DATABASE_URL_MUST_DIFFER");
if (confirmedTarget !== MERLY_PROJECT_ID) {
  throw new Error(`CONFIRM_TARGET_PROJECT must be ${MERLY_PROJECT_ID} before writing to Merly`);
}

const source = neon(sourceUrl);
const target = neon(targetUrl);

async function sourceRows(query, values = []) {
  return source.query(query, values);
}

async function targetQuery(query, values = []) {
  return target.query(query, values);
}

async function migrateProducts() {
  const products = await sourceRows(`
    SELECT id, brand, name, description, presentation, category, own_brand,
      image_url, COALESCE(image_status, 'pending') AS image_status,
      COALESCE(sales_unit, 'otro') AS sales_unit, quote_only, badge,
      is_active, is_featured, sort_order, internal_note
    FROM products
    ORDER BY sort_order, brand, name, id
  `);

  await targetQuery(
    `INSERT INTO products (
      id, brand, name, description, presentation, category, own_brand,
      image_url, image_status, sales_unit, quote_only, badge, is_active,
      is_featured, sort_order, internal_note, updated_at
    )
    SELECT
      id, brand, name, description, presentation, category, own_brand,
      image_url, image_status, sales_unit, quote_only, badge, is_active,
      is_featured, sort_order, internal_note, NOW()
    FROM jsonb_to_recordset($1::jsonb) AS item(
      id text, brand text, name text, description text, presentation text,
      category text, own_brand boolean, image_url text, image_status text,
      sales_unit text, quote_only boolean, badge text, is_active boolean,
      is_featured boolean, sort_order integer, internal_note text
    )
    ON CONFLICT (id) DO UPDATE SET
      brand=EXCLUDED.brand, name=EXCLUDED.name, description=EXCLUDED.description,
      presentation=EXCLUDED.presentation, category=EXCLUDED.category,
      own_brand=EXCLUDED.own_brand, image_url=EXCLUDED.image_url,
      image_status=EXCLUDED.image_status, sales_unit=EXCLUDED.sales_unit,
      quote_only=EXCLUDED.quote_only, badge=EXCLUDED.badge,
      is_active=EXCLUDED.is_active, is_featured=EXCLUDED.is_featured,
      sort_order=EXCLUDED.sort_order, internal_note=EXCLUDED.internal_note,
      updated_at=NOW()`,
    [JSON.stringify(products)],
  );

  return products.length;
}

async function migratePriceTiers() {
  const tiers = await sourceRows(`
    SELECT product_id, min_quantity, unit_price
    FROM product_price_tiers
    ORDER BY product_id, min_quantity
  `);

  await targetQuery("DELETE FROM product_price_tiers");
  if (tiers.length) {
    await targetQuery(
      `INSERT INTO product_price_tiers (product_id, min_quantity, unit_price)
       SELECT product_id, min_quantity, unit_price
       FROM jsonb_to_recordset($1::jsonb) AS item(
         product_id text, min_quantity integer, unit_price numeric
       )
       ON CONFLICT (product_id, min_quantity)
       DO UPDATE SET unit_price=EXCLUDED.unit_price`,
      [JSON.stringify(tiers)],
    );
  }

  return tiers.length;
}

async function migrateBanners() {
  const banners = await sourceRows(`
    SELECT id, kicker, title, body, cta_label, cta_href, theme,
      image_url, mobile_image_url, is_active, sort_order
    FROM banners
    ORDER BY sort_order, id
  `);

  await targetQuery(
    `INSERT INTO banners (
      id, kicker, title, body, cta_label, cta_href, theme,
      image_url, mobile_image_url, is_active, sort_order, updated_at
    )
    SELECT id, kicker, title, body, cta_label, cta_href, theme,
      image_url, mobile_image_url, is_active, sort_order, NOW()
    FROM jsonb_to_recordset($1::jsonb) AS item(
      id text, kicker text, title text, body text, cta_label text,
      cta_href text, theme text, image_url text, mobile_image_url text,
      is_active boolean, sort_order integer
    )
    ON CONFLICT (id) DO UPDATE SET
      kicker=EXCLUDED.kicker, title=EXCLUDED.title, body=EXCLUDED.body,
      cta_label=EXCLUDED.cta_label, cta_href=EXCLUDED.cta_href,
      theme=EXCLUDED.theme, image_url=EXCLUDED.image_url,
      mobile_image_url=EXCLUDED.mobile_image_url, is_active=EXCLUDED.is_active,
      sort_order=EXCLUDED.sort_order, updated_at=NOW()`,
    [JSON.stringify(banners)],
  );

  return banners.length;
}

async function migrateSettings() {
  const settings = await sourceRows(`
    SELECT key, value FROM site_settings
    WHERE key <> $1
    ORDER BY key
  `, [["sales", "advisors"].join("_")]);

  const adapted = settings.map((row) => {
    if (row.key === "whatsapp_number") return { ...row, value: "51991212263" };
    return row;
  });

  if (adapted.length) {
    await targetQuery(
      `INSERT INTO site_settings(key, value, updated_at)
       SELECT key, value, NOW()
       FROM jsonb_to_recordset($1::jsonb) AS item(key text, value jsonb)
       ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
      [JSON.stringify(adapted)],
    );
  }

  return adapted.length;
}

const [products, tiers, banners, settings] = await Promise.all([
  migrateProducts(),
  migratePriceTiers(),
  migrateBanners(),
  migrateSettings(),
]);

console.log(JSON.stringify({ products, tiers, banners, settings }, null, 2));
