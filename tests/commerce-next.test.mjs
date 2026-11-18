import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const file = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("V4 public storefront is distinct and built for wholesale shopping", () => {
  const route = file("app/page.tsx");
  const home = file("app/WholesaleHome.tsx");
  const css = file("app/wholesale-home.css");
  assert.match(route, /import WholesaleHome from "\.\/WholesaleHome"/);
  assert.match(route, /return <WholesaleHome/);
  assert.match(route, /wholesale-home\.css/);
  for (const section of ["wh-main-search","wh-hero-grid","wh-category-grid","wh-product-grid","wh-process-grid","wh-delivery-grid","wh-lead-grid"]) {
    assert.ok(home.includes(section), "Missing " + section);
  }
  assert.match(css, /--wh-blue:#075eab/);
  assert.match(css, /--wh-cyan:#10a6bb/);
  assert.match(css, /@media\(max-width:670px\)/);
});

test("V4 retains commercial rules, content editor and WhatsApp lead attribution", () => {
  const route = file("app/page.tsx");
  const home = file("app/WholesaleHome.tsx");
  assert.match(route, /getSiteContent\(\)/);
  assert.match(route, /getFeaturedProducts\(12\)/);
  assert.match(route, /getCommercialRules\(\)/);
  assert.match(home, /commercialRules\.freeDeliveryOwnBrands/);
  assert.match(home, /commercialRules\.freeDeliveryMixed/);
  assert.match(home, /content\.banners\.filter/);
  assert.match(home, /content\.settings\.sideBanners\.presale/);
  assert.match(home, /content\.settings\.sideBanners\.delivery/);
  assert.match(home, /withLeadOrigin\(message\)/);
  assert.match(home, /labels\.quoteButton/);
});

test("the existing admin CMS preview displays V4 without publishing", () => {
  const preview = file("app/admin/contenido/vista-previa/page.tsx");
  const home = file("app/WholesaleHome.tsx");
  assert.match(preview, /getSiteContentDraft\(\)/);
  assert.match(preview, /<WholesaleHome/);
  assert.match(preview, /previewMode/);
  assert.match(home, /Vista previa del editor/);
});

test("product selection and WhatsApp quote logic stays intact in V4 catalog", () => {
  const catalog = file("app/catalogo/CatalogClient.tsx");
  const route = file("app/catalogo/page.tsx");
  const css = file("app/catalogo/wholesale-catalog.css");
  assert.match(route, /wholesale-catalog\.css/);
  assert.match(catalog, /merly-catalog-v4/);
  assert.match(catalog, /wc-hero-grid/);
  assert.match(catalog, /wc-results/);
  assert.match(catalog, /function addProduct\(/);
  assert.match(catalog, /function setQuantity\(/);
  assert.match(catalog, /function sendQuote\(/);
  assert.match(catalog, /withLeadOrigin\(message\)/);
  assert.match(catalog, /visibleProducts\.map/);
  assert.match(css, /@media\(max-width:760px\)/);
});
