import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
test("distributor and campaign share the distributor canonical, with only canonical in sitemap", async () => {
  for (const path of ["app/distribuidor/page.tsx", "app/tiktok-distribuidores/layout.tsx"]) {
    assert.match(await read(path), /canonical: "\/distribuidor"/);
  }
  const sitemap = await read("app/sitemap.ts");
  assert.match(sitemap, /new URL\("\/distribuidor", base\)/);
  assert.doesNotMatch(sitemap, /tiktok-distribuidores/);
});
test("product detail declares breadcrumb structured data", async () => {
  const source = await read("app/productos/[slug]/page.tsx");
  assert.match(source, /"@type": "BreadcrumbList"/);
  assert.match(source, /position: 3, name: fullName, item: canonical/);
});
