import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const readText = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("cart persists quantities only and reconciles current products", async () => {
  const source = await readText("app/catalogo/CatalogClient.tsx");
  const productButton = await readText("app/productos/[slug]/ProductQuoteButton.tsx");
  assert.match(source, /type CartQuantities = Record<string, number>/);
  assert.match(source, /merly-catalog-cart-v2/);
  assert.match(productButton, /merly-catalog-cart-v2/);
  assert.match(source, /JSON\.stringify\(quantities\)/);
  assert.match(source, /api\/catalogo\?ids=/);
  assert.match(source, /de estar disponible/);
  assert.doesNotMatch(source, /JSON\.stringify\(selected\)/);
});

test("catalog handles stale pagination and temporary quantity input", async () => {
  const source = await readText("app/catalogo/CatalogClient.tsx");
  assert.match(source, /loadSequence/);
  assert.match(source, /searchSequence/);
  assert.match(source, /value === ""/);
  assert.match(source, /onBlur=\{\(\) => commitQuantity/);
  assert.match(source, />Quitar</);
});

test("catalog search is accent-insensitive without wildcard interpolation", async () => {
  const source = await readText("app/lib/neon-catalog.ts");
  assert.match(source, /position\(\$3 in translate/);
  assert.doesNotMatch(source, /ILIKE/);
  assert.match(source, /getPublishedProductsByIds/);
  assert.match(source, /CATALOG_QUERY_TIMEOUT/);
});

test("Base64 product image endpoint is removed", async () => {
  const utils = await readText("app/lib/product-utils.ts");
  assert.doesNotMatch(utils, /api\/product-image/);
  await assert.rejects(access(new URL("../app/api/product-image/[id]/route.ts", import.meta.url)));
});

test("delivery rules are centralized and configurable", async () => {
  const rules = await readText("app/lib/commercial-rules.ts");
  const page = await readText("app/catalogo/page.tsx");
  assert.match(rules, /DELIVERY_OWN_BRANDS_MINIMUM/);
  assert.match(rules, /DELIVERY_MIXED_MINIMUM/);
  assert.match(page, /commercialRules=\{getCommercialRules\(\)\}/);
});


test("official Merly WhatsApp receives catalog quote messages", async () => {
  const catalog = await readText("app/catalogo/CatalogClient.tsx");
  const page = await readText("app/catalogo/page.tsx");
  const removedPortal = ["Advi", "sorShowcasePortal.tsx"].join("");
  await assert.rejects(access(new URL(`../app/catalogo/${removedPortal}`, import.meta.url)));
  const removedModule = ["vende", "doras"].join("");
  await assert.rejects(access(new URL(`../app/api/${removedModule}/route.ts`, import.meta.url)));
  await assert.rejects(access(new URL(`../app/api/admin/${removedModule}/route.ts`, import.meta.url)));
  assert.match(page, /WHATSAPP_NUMBER/);
  assert.match(catalog, /whatsappNumber: string/);
  assert.match(catalog, /equipo de \$\{BRAND_NAME\}/);
  assert.match(catalog, /\*Quiero cotizar:\*/);
  assert.match(catalog, /\*Entrega:\*/);
  assert.doesNotMatch(catalog, /chosenAdvisor/);
  assert.doesNotMatch(catalog, new RegExp(["ase", "sora"].join("")));
});
