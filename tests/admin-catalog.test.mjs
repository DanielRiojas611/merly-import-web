import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const readText = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin uses one typed catalog implementation", async () => {
  const page = await readText("app/admin/page.tsx");
  const catalog = await readText("app/admin/AdminCatalog.tsx");
  assert.match(page, /import AdminCatalog from "\.\/AdminCatalog"/);
  assert.doesNotMatch(page, /as never\[\]/);
  assert.match(catalog, /initialProducts: AdminProductInput\[\]/);
  assert.match(catalog, /readOnly=\{editingPublished\}/);
  assert.match(catalog, /beforeunload/);
  assert.match(catalog, /ProductAuditEntry/);
  await assert.rejects(access(new URL("../app/admin/AdminCatalogV2.tsx", import.meta.url)));
  await assert.rejects(access(new URL("../app/admin/AdminCatalogV3.tsx", import.meta.url)));
  await assert.rejects(access(new URL("../app/admin/AdminModuleLinks.tsx", import.meta.url)));
  await assert.rejects(access(new URL("../app/admin/AdminImageQualityMonitor.tsx", import.meta.url)));
});

test("CSV import and product fields stay aligned", async () => {
  const catalog = await readText("app/admin/AdminCatalog.tsx");
  assert.match(catalog, /function parseCsv\(/);
  assert.match(catalog, /quoted = !quoted/);
  assert.match(catalog, /unidad_venta/);
  assert.match(catalog, /estado_imagen/);
  assert.match(catalog, /observacion_interna/);
  assert.match(catalog, /Duplicado semántico/);
});

test("admin is non-indexable and product history is versioned", async () => {
  const layout = await readText("app/admin/layout.tsx");
  const migration = await readText("neon/migrations/0003_admin_audit_log.sql");
  assert.match(layout, /index: false/);
  assert.match(layout, /follow: false/);
  assert.match(migration, /product_audit_log/);
  assert.match(migration, /product_audit_log_product_created_idx/);
});
