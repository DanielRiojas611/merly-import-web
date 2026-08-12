import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readText = (path) => readFile(new URL(path, root), "utf8");

test("the SEO pilot contains exactly 20 unique product ids", async () => {
  const source = await readText("app/lib/product-seo.ts");
  const block = source.match(/SEO_PILOT_PRODUCT_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  assert.ok(block, "SEO pilot id list must exist");
  const ids = [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, 20);
  assert.equal(new Set(ids).size, 20);
});

test("product routes remain descriptive and resolve to controlled ids", async () => {
  const source = await readText("app/lib/product-seo.ts");
  assert.match(source, /return `\$\{readable\}--\$\{product\.id\}`/);
  assert.match(source, /isSeoPilotProductId\(id\)/);
  assert.match(source, /\/productos\/\$\{productSlug\(product\)\}/);
});

test("product detail pages use the existing quote cart", async () => {
  const detail = await readText("app/productos/[slug]/page.tsx");
  const button = await readText("app/productos/[slug]/ProductQuoteButton.tsx");
  assert.match(detail, /"@type": "Product"/);
  assert.match(detail, /ProductQuoteButton/);
  assert.match(button, /merly-catalog-cart-v2/);
  assert.match(button, /router\.push\(`\/catalogo\?buscar=/);
});

test("the sitemap exposes the product index and pilot details", async () => {
  const sitemap = await readText("app/sitemap.ts");
  assert.match(sitemap, /new URL\("\/productos", base\)/);
  assert.match(sitemap, /SEO_PILOT_PRODUCT_IDS/);
  assert.match(sitemap, /productPath\(product\)/);
});
