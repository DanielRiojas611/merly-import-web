import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const file = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("public storefront uses the standalone new commerce composition", () => {
  const page = file("app/page.tsx");
  const home = file("app/CommerceHome.tsx");
  const css = file("app/next-commerce.css");
  assert.match(page, /import CommerceHome from "\.\/CommerceHome"/);
  assert.match(page, /return <CommerceHome/);
  assert.match(home, /mx-hero-grid/);
  assert.match(home, /mx-category-grid/);
  assert.match(home, /mx-product-grid/);
  assert.match(home, /mx-steps/);
  assert.match(home, /mx-quote-grid/);
  assert.match(css, /@media\(max-width:650px\)/);
});

test("wholesale rules and original data source are preserved", () => {
  const page = file("app/page.tsx");
  const home = file("app/CommerceHome.tsx");
  assert.match(page, /getSiteContent\(\)/);
  assert.match(page, /getFeaturedProducts\(12\)/);
  assert.match(page, /getCommercialRules\(\)/);
  assert.match(home, /freeDeliveryOwnBrands/);
  assert.match(home, /freeDeliveryMixed/);
  assert.match(home, /content\.banners\.filter/);
  assert.match(home, /settings\.sideBanners\.presale/);
  assert.match(home, /settings\.sideBanners\.delivery/);
  assert.match(home, /withLeadOrigin\(message\)/);
  assert.match(home, /settings\.labels\.quoteButton/);
});

test("editor draft preview continues to show the design without publishing", () => {
  const preview = file("app/admin/contenido/vista-previa/page.tsx");
  const home = file("app/CommerceHome.tsx");
  assert.match(preview, /getSiteContentDraft\(\)/);
  assert.match(preview, /<CommerceHome/);
  assert.match(preview, /previewMode/);
  assert.match(home, /Vista previa de contenido/);
});

test("catalog preserves quantity and WhatsApp flow with new presentation", () => {
  const catalog = file("app/catalogo/CatalogClient.tsx");
  const route = file("app/catalogo/page.tsx");
  assert.match(route, /commerce-catalog\.css/);
  assert.match(catalog, /merly-catalog-next/);
  assert.match(catalog, /mc-cover-inner/);
  assert.match(catalog, /mc-results-head/);
  assert.match(catalog, /function addProduct\(/);
  assert.match(catalog, /function setQuantity\(/);
  assert.match(catalog, /function sendQuote\(/);
  assert.match(catalog, /withLeadOrigin\(message\)/);
  assert.match(catalog, /visibleProducts\.map/);
});