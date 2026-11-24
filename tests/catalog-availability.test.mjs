import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/api/catalogo/route.ts", import.meta.url), "utf8");
const helper = source.slice(source.indexOf("function numberParam"), source.indexOf("function cleanCategory"));
const javascript = ts.transpileModule(helper, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const numberParam = new Function(`${javascript}; return numberParam;`)();

test("missing and blank pagination use the full default page instead of one item", () => {
  for (const value of [null, "", " ", "invalid"]) assert.equal(numberParam(value, 24, 48), 24);
  assert.equal(numberParam("48", 24, 48), 48);
  assert.equal(numberParam("900", 24, 48), 48);
  assert.equal(numberParam("-2", 0, 5000), 0);
  assert.equal(numberParam("24", 0, 5000), 24);
});

test("database outage distinguishes a partial backup and preserves saved cart items", async () => {
  const client = await readFile(new URL("../app/catalogo/CatalogClient.tsx", import.meta.url), "utf8");
  assert.match(source, /totalReliable: false/);
  assert.match(source, /status: 503/);
  assert.match(client, /setQuantities\(stored\)/);
  assert.match(client, /productos de respaldo disponibles/);
});
