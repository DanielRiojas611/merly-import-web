import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("V3 loads only its own storefront theme and avoids the legacy V2 global overlay", () => {
  const layout = source("app/layout.tsx");
  const page = source("app/page.tsx");
  const catalogRoute = source("app/catalogo/page.tsx");
  assert.doesNotMatch(layout, /import "\.\/merly-commerce-refresh\.css"/);
  assert.match(page, /editorial-home\.css/);
  assert.doesNotMatch(page, /next-commerce\.css/);
  assert.match(catalogRoute, /editorial-catalog\.css/);
  assert.doesNotMatch(catalogRoute, /commerce-catalog\.css/);
});

test("editorial homepage maintains functioning catalog and WhatsApp lead pathways", () => {
  const home = source("app/EditorialHome.tsx");
  assert.match(home, /href="\/catalogo"/);
  assert.match(home, /function submitLead/);
  assert.match(home, /withLeadOrigin\(message\)/);
  assert.match(home, /ed-collections/);
  assert.match(home, /ed-campaign/);
  assert.match(home, /ed-contact/);
  assert.match(home, /freeDeliveryOwnBrands/);
});

test("catalog retains quote, analytics and sorting behavior independently from visual theme", () => {
  const catalog = source("app/catalogo/CatalogClient.tsx");
  assert.match(catalog, /function sendQuote\(/);
  assert.match(catalog, /function setQuantity\(/);
  assert.match(catalog, /function addProduct\(/);
  assert.match(catalog, /visibleProducts\.map/);
  assert.match(catalog, /Ordenar productos mostrados/);
  assert.match(catalog, /catalog_search/);
  assert.match(catalog, /catalog_add_to_quote/);
  assert.match(catalog, /quote_whatsapp/);
});
