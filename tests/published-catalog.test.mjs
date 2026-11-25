import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const bundle = JSON.parse(await readFile(new URL("../app/catalogo/published-products.json", import.meta.url), "utf8"));
async function load(path, dependencies = {}) {
  const code = ts.transpileModule(await readFile(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, resolveJsonModule: true } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(name => { if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`); return dependencies[name]; }, module, module.exports);
  return module.exports;
}
const snapshot = await load("app/lib/published-catalog.ts", { "../catalogo/published-products.json": { default: bundle } });
const utils = await load("app/lib/product-utils.ts");
const catalog = await load("app/lib/neon-catalog.ts", { "./published-catalog": snapshot, "./product-utils": utils, "@neondatabase/serverless": { neon() { throw new Error("Public browsing must not connect to Neon"); } } });

test("public browsing keeps all 170 verified products when both storage and Neon are unavailable", async () => {
  const previousFetch = global.fetch;
  const previousError = console.error; console.error = () => {};
  global.fetch = async () => { throw new Error("Storage unavailable"); };
  try {
    assert.equal((await catalog.getPublishedProducts()).length, 170);
    const first = await catalog.getPublishedProductsPage({ limit: 48 });
    const second = await catalog.getPublishedProductsPage({ limit: 48, offset: 48 });
    assert.equal(first.total, 170);
    assert.equal(first.products.length, 48);
    assert.equal(second.products.length, 48);
    assert.equal(new Set([...first.products, ...second.products].map(p => p.id)).size, 96);
    assert.deepEqual(await catalog.getPublishedProductsByIds([first.products[0].id, "absent-product"]), [first.products[0]]);
    assert.ok((await catalog.getFeaturedProducts(5)).length === 5);
    assert.deepEqual(await catalog.getCatalogCategories(), ["Higiene", "Hogar", "Limpieza"]);
    const selected = await catalog.getPublishedProductsPage({ query: first.products[0].name });
    assert.ok(selected.products.some(p => p.id === first.products[0].id));
    const ownBrands = await catalog.getPublishedProductsPage({ filter: "Marcas propias", limit: 48 });
    assert.ok(ownBrands.products.every(p => p.ownBrand));
  } finally { global.fetch = previousFetch; console.error = previousError; }
});

test("an intentionally empty publication stays empty and corrupt snapshots are rejected", async () => {
  const previousFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ products: [] }) });
  try { assert.deepEqual(await catalog.getPublishedProductsPage(), { products: [], total: 0 }); }
  finally { global.fetch = previousFetch; }
  assert.equal(snapshot.validatePublishedCatalog({ products: [bundle.products[0], bundle.products[0]] }), null);
  assert.equal(snapshot.validatePublishedCatalog({ products: [{ id: "bad" }] }), null);
  assert.equal(snapshot.validatePublishedCatalog(bundle).length, 170);
  for (const p of bundle.products) {
    assert.equal("internalReview" in p, false);
    assert.equal("internal_note" in p, false);
    assert.equal("before_data" in p, false);
  }
});
