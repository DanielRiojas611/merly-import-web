import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const file = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("editorial V3 is the active storefront, with its own mobile design system", () => {
  const page = file("app/page.tsx");
  const home = file("app/EditorialHome.tsx");
  const css = file("app/editorial-home.css");
  assert.match(page, /import EditorialHome from "\.\/EditorialHome"/);
  assert.match(page, /return <EditorialHome/);
  assert.match(page, /editorial-home\.css/);
  assert.match(home, /ed-hero-grid/);
  assert.match(home, /ed-collections-grid/);
  assert.match(home, /ed-products-grid/);
  assert.match(home, /ed-how-steps/);
  assert.match(home, /ed-contact-grid/);
  assert.match(css, /--ed-forest:#203e34/);
  assert.match(css, /--ed-serif:Georgia/);
  assert.match(css, /@media\(max-width:690px\)/);
});

test("commercial rules, CMS campaigns and origin tracking remain in place", () => {
  const page = file("app/page.tsx");
  const home = file("app/EditorialHome.tsx");
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

test("admin content preview renders the new design without publishing", () => {
  const preview = file("app/admin/contenido/vista-previa/page.tsx");
  const home = file("app/EditorialHome.tsx");
  assert.match(preview, /getSiteContentDraft\(\)/);
  assert.match(preview, /<EditorialHome/);
  assert.match(preview, /previewMode/);
  assert.match(home, /Vista previa del editor/);
});

test("editorial catalog preserves quantities, search and WhatsApp quote flows", () => {
  const catalog = file("app/catalogo/CatalogClient.tsx");
  const route = file("app/catalogo/page.tsx");
  const css = file("app/catalogo/editorial-catalog.css");
  assert.match(route, /editorial-catalog\.css/);
  assert.match(catalog, /merly-catalog-v3/);
  assert.match(catalog, /sc-hero-layout/);
  assert.match(catalog, /sc-results/);
  assert.match(catalog, /function addProduct\(/);
  assert.match(catalog, /function setQuantity\(/);
  assert.match(catalog, /function sendQuote\(/);
  assert.match(catalog, /withLeadOrigin\(message\)/);
  assert.match(catalog, /visibleProducts\.map/);
  assert.match(css, /--sc-forest:#203e34/);
});