import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");

test("SEO groups use existing published product data and only active groups enter the sitemap", async () => {
  const groups = await read("app/lib/seo-groups.ts");
  assert.equal([...groups.matchAll(/^  (?:category|brand)\("/gm)].length, 9);
  assert.match(groups, /comparableText\(brandName\) === comparableText\(group.label\)/);
  assert.match(groups, /products.filter\(product => matchesSeoGroup/);
  const sitemap = await read("app/sitemap.ts");
  assert.match(sitemap, /activeSeoGroups\(products\)/);
  const page = await read("app/seo/SeoGroupPage.tsx");
  assert.match(page, /getPublishedProducts\(\)/);
  assert.match(page, /canonical: group.path/);
  assert.match(page, /products.length === 0 \? \{ robots: \{ index: false/);
  assert.match(page, /if \(!group\) notFound\(\)/);
  assert.match(page, /productPath\(product\)/);
});
test("product title and WhatsApp action do not change existing canonical route or quote cart", async () => {
  const page = await read("app/productos/[slug]/page.tsx");
  assert.match(page, /productSeoName\(product\)\} al por mayor/);
  assert.match(page, /const canonical = productPath\(product\)/);
  assert.match(page, /ProductQuoteButton productId=\{product.id\}/);
  assert.match(page, /Cotizar por WhatsApp/);
  const config = await read("next.config.ts");
  assert.match(config, /source: "\/wp-sitemap.xml", destination: "\/sitemap.xml", permanent: true/);
});
