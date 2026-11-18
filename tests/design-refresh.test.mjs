import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("commercial refresh is imported through the app layout", () => {
  const layout = source("app/layout.tsx");
  const refresh = source("app/merly-commerce-refresh.css");
  assert.match(layout, /import "\.\/merly-commerce-refresh\.css";/);
  assert.match(refresh, /\.refresh-process/);
  assert.match(refresh, /@media\(max-width:760px\)/);
});

test("home keeps its working catalog and WhatsApp flow while explaining the purchase process", () => {
  const home = source("app/HomeClient.tsx");
  assert.match(home, /href="\/catalogo"/);
  assert.match(home, /function submitLead/);
  assert.match(home, /withLeadOrigin\(message\)/);
  assert.match(home, /refresh-advantages/);
  assert.match(home, /refresh-process/);
  assert.match(home, /Los precios y la disponibilidad se confirman/);
});

test("catalog keeps quote and pricing logic while offering visible-results sorting", () => {
  const catalog = source("app/catalogo/CatalogClient.tsx");
  assert.match(catalog, /function sendQuote\(/);
  assert.match(catalog, /function setQuantity\(/);
  assert.match(catalog, /function addProduct\(/);
  assert.match(catalog, /visibleProducts\.map/);
  assert.match(catalog, /Ordenar productos mostrados/);
  assert.match(catalog, /Precios finales y la disponibilidad|precios finales y la disponibilidad/i);
});
