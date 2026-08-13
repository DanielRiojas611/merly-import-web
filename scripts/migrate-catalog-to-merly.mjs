import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const sourceUrl = process.env.SOURCE_DATABASE_URL?.trim();
const targetUrl = process.env.DATABASE_URL?.trim();
const confirmedTarget = process.env.CONFIRM_TARGET_PROJECT?.trim();
const applyMigrations = process.env.APPLY_MIGRATIONS === "1";
const replaceTargetCatalog = process.env.REPLACE_TARGET_CATALOG === "1";
const MERLY_PROJECT_ID = "solitary-recipe-80594074";
const MERLY_WHATSAPP_NUMBER = "51991212263";
const MERLY_LOGISTICS_HERO = "/banners/merly-logistica-hero.png";

const MERLY_BANNERS = [
  {
    id: "merly-mayorista",
    kicker: "Importadora mayorista",
    title: "Surtido de alta rotacion para negocios",
    body: "Abastece tu bodega, botica o distribuidora con lineas de higiene, limpieza, hogar y consumo masivo.",
    cta_label: "Ver catalogo",
    cta_href: "/catalogo",
    theme: "brand",
    image_url: "/banners/portafolio-marcas-propias-v2.webp",
    mobile_image_url: "/banners/portafolio-marcas-propias-mobile-v12.webp",
    is_active: true,
    sort_order: 10,
  },
  {
    id: "merly-entregas",
    kicker: "Logistica Merly",
    title: "Importacion, almacen y despacho coordinado",
    body: "Cotiza por volumen y coordina salida de mercaderia para Lima o agencia a provincias.",
    cta_label: "Cotizar ahora",
    cta_href: "/catalogo",
    theme: "delivery",
    image_url: MERLY_LOGISTICS_HERO,
    mobile_image_url: MERLY_LOGISTICS_HERO,
    is_active: true,
    sort_order: 20,
  },
];

const MERLY_HOMEPAGE_SETTINGS = {
  sideBanners: {
    presale: {
      kicker: "Preventa mayorista",
      title: "Separa stock antes de campana",
      body: "Consulta disponibilidad, volumen y fecha estimada para compras programadas.",
      ctaLabel: "Ver preventa",
      ctaHref: "#preventa",
      imageUrl: "/banners/preventa-logistica-marcas-v12.webp",
    },
    delivery: {
      kicker: "Logistica Merly",
      title: "Despacho para Lima y provincias",
      body: "Coordinamos cada pedido por WhatsApp con datos claros de entrega y agencia.",
      ctaLabel: "Ver entregas",
      ctaHref: "#entregas",
      imageUrl: MERLY_LOGISTICS_HERO,
    },
  },
  labels: {
    searchButton: "Buscar",
    headerQuote: "Cotizar",
    headerWhatsapp: "WhatsApp",
    catalogButton: "Ver catalogo",
    quoteButton: "Continuar por WhatsApp",
    tiktok: "Siguenos en TikTok",
  },
  contact: {
    phone: MERLY_WHATSAPP_NUMBER,
    phoneLabel: "991 212 263",
    email: "Merlyperez230@gmail.com",
  },
  facebookUrl: "https://www.facebook.com/p/Merly-Import-61574358052678/",
  tiktokUrl: "https://www.tiktok.com/@merly.import",
};

if (!sourceUrl) throw new Error("SOURCE_DATABASE_URL_MISSING");
if (!targetUrl) throw new Error("DATABASE_URL_MISSING");
if (sourceUrl === targetUrl) throw new Error("SOURCE_AND_TARGET_DATABASE_URL_MUST_DIFFER");
if (confirmedTarget !== MERLY_PROJECT_ID) {
  throw new Error(`CONFIRM_TARGET_PROJECT must be ${MERLY_PROJECT_ID} before writing to Merly`);
}

const source = neon(sourceUrl);
const target = neon(targetUrl);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDir);

async function sourceRows(query, values = []) {
  return source.query(query, values);
}

async function targetQuery(query, values = []) {
  return target.query(query, values);
}

function splitSqlStatements(sqlText) {
  const statements = [];
  let current = "";
  let quote = "";
  let dollarTag = "";
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < sqlText.length; index += 1) {
    const char = sqlText[index];
    const next = sqlText[index + 1] ?? "";

    if (lineComment) {
      current += char;
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      current += char;
      if (char === "*" && next === "/") {
        current += next;
        index += 1;
        blockComment = false;
      }
      continue;
    }

    if (dollarTag) {
      if (sqlText.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length - 1;
        dollarTag = "";
      } else {
        current += char;
      }
      continue;
    }

    if (quote) {
      current += char;
      if (char === quote) {
        if (quote === "'" && next === "'") {
          current += next;
          index += 1;
        } else {
          quote = "";
        }
      }
      continue;
    }

    if (char === "-" && next === "-") {
      current += char + next;
      index += 1;
      lineComment = true;
      continue;
    }

    if (char === "/" && next === "*") {
      current += char + next;
      index += 1;
      blockComment = true;
      continue;
    }

    if (char === "'" || char === '"') {
      current += char;
      quote = char;
      continue;
    }

    if (char === "$") {
      const match = sqlText.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        index += dollarTag.length - 1;
        continue;
      }
    }

    if (char === ";") {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
      continue;
    }

    current += char;
  }

  const rest = current.trim();
  if (rest) statements.push(rest);
  return statements;
}

async function applySchemaMigrations() {
  const migrationsDir = join(projectRoot, "neon", "migrations");
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  let statements = 0;
  for (const file of files) {
    const sqlText = await readFile(join(migrationsDir, file), "utf8");
    for (const statement of splitSqlStatements(sqlText)) {
      await targetQuery(statement);
      statements += 1;
    }
  }
  return { files: files.length, statements };
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

  if (replaceTargetCatalog) {
    await targetQuery("DELETE FROM product_price_tiers");
    await targetQuery("DELETE FROM products");
  }

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
  await targetQuery(
    `WITH incoming AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb) AS item(
         id text, kicker text, title text, body text, cta_label text,
         cta_href text, theme text, image_url text, mobile_image_url text,
         is_active boolean, sort_order integer
       )
     ), upserted AS (
       INSERT INTO banners (
         id, kicker, title, body, cta_label, cta_href, theme,
         image_url, mobile_image_url, is_active, sort_order, updated_at
       )
       SELECT id, kicker, title, body, cta_label, cta_href, theme,
         image_url, mobile_image_url, is_active, sort_order, NOW()
       FROM incoming
       ON CONFLICT (id) DO UPDATE SET
         kicker=EXCLUDED.kicker, title=EXCLUDED.title, body=EXCLUDED.body,
         cta_label=EXCLUDED.cta_label, cta_href=EXCLUDED.cta_href,
         theme=EXCLUDED.theme, image_url=EXCLUDED.image_url,
         mobile_image_url=EXCLUDED.mobile_image_url, is_active=EXCLUDED.is_active,
         sort_order=EXCLUDED.sort_order, updated_at=NOW()
       RETURNING id
     )
     DELETE FROM banners
     WHERE id NOT IN (SELECT id FROM incoming)`,
    [JSON.stringify(MERLY_BANNERS)],
  );

  return MERLY_BANNERS.length;
}

async function migrateSettings() {
  const sourceSettings = await sourceRows(`
    SELECT key, value FROM site_settings
    WHERE key IN ('catalog_version')
    ORDER BY key
  `);

  const settings = new Map(sourceSettings.map((row) => [row.key, row.value]));
  settings.set("whatsapp_number", MERLY_WHATSAPP_NUMBER);
  settings.set("homepage_content", MERLY_HOMEPAGE_SETTINGS);

  await targetQuery("DELETE FROM site_settings WHERE key IN ('homepage_content_draft', 'homepage_content_previous', 'sales_advisors')");
  await targetQuery(
    `INSERT INTO site_settings(key, value, updated_at)
     SELECT key, value, NOW()
     FROM jsonb_to_recordset($1::jsonb) AS item(key text, value jsonb)
     ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
    [JSON.stringify([...settings].map(([key, value]) => ({ key, value })))],
  );

  return settings.size;
}

const schema = applyMigrations ? await applySchemaMigrations() : null;
const products = await migrateProducts();
const tiers = await migratePriceTiers();
const banners = await migrateBanners();
const settings = await migrateSettings();

console.log(JSON.stringify({ schema, products, tiers, banners, settings }, null, 2));
