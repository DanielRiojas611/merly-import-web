import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const file = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("new wholesale theme does not import abandoned V2 or V3 styles", () => {
  const layout = file("app/layout.tsx");
  const page = file("app/page.tsx");
  const catalog = file("app/catalogo/page.tsx");
  assert.doesNotMatch(layout, /import "\.\/merly-commerce-refresh\.css"/);
  assert.match(page, /wholesale-home\.css/);
  assert.doesNotMatch(page, /editorial-home\.css|next-commerce\.css/);
  assert.match(catalog, /wholesale-catalog\.css/);
  assert.doesNotMatch(catalog, /editorial-catalog\.css|commerce-catalog\.css/);
});

test("homepage search and quote paths are preserved", () => {
  const home = file("app/WholesaleHome.tsx");
  assert.match(home, /role="search"/);
  assert.match(home, /name="buscar"/);
  assert.match(home, /action="\/catalogo"/);
  assert.match(home, /withLeadOrigin\(message\)/);
  assert.match(home, /href="\/catalogo"/);
  assert.match(home, /analytics\("whatsapp_click"/);
});

test("catalog search, filtering, cart, pricing and analytics remain available", () => {
  const catalog = file("app/catalogo/CatalogClient.tsx");
  assert.match(catalog, /function addProduct\(/);
  assert.match(catalog, /function setQuantity\(/);
  assert.match(catalog, /function sendQuote\(/);
  assert.match(catalog, /unitPrice\(/);
  assert.match(catalog, /visibleProducts\.map/);
  assert.match(catalog, /catalog_search/);
  assert.match(catalog, /catalog_filter/);
  assert.match(catalog, /catalog_add_to_quote/);
  assert.match(catalog, /quote_whatsapp/);
});
