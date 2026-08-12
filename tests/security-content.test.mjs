import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readText = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin mutations enforce origin, content type and no-store", async () => {
  const helper = await readText("app/lib/admin-request.ts");
  const login = await readText("app/api/admin/login/route.ts");
  const content = await readText("app/api/admin/content/publish/route.ts");
  assert.match(helper, /origin === new URL\(request\.url\)\.origin/);
  assert.match(helper, /Cache-Control/);
  assert.match(login, /isFormMutation/);
  assert.match(content, /isJsonMutation/);
});

test("login failure counter is atomic and cleans stale records", async () => {
  const source = await readText("app/lib/admin-login-guard.ts");
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /ON CONFLICT \(key\) DO UPDATE/);
  assert.match(source, /updated_at < \$1::timestamptz/);
});

test("previews and admin are never indexable", async () => {
  const layout = await readText("app/layout.tsx");
  const adminLayout = await readText("app/admin/layout.tsx");
  const config = await readText("next.config.ts");
  assert.match(layout, /VERCEL_ENV === "production"/);
  assert.match(adminLayout, /index: false/);
  assert.match(config, /X-Robots-Tag/);
  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /Strict-Transport-Security/);
});

test("homepage publication is atomic and validates active banners", async () => {
  const source = await readText("app/lib/site-content-db.ts");
  assert.match(source, /WITH incoming AS/);
  assert.match(source, /ACTIVE_BANNER_REQUIRED/);
  assert.match(source, /BANNER_ID_DUPLICATE/);
  assert.match(source, /BANNER_ORDER_DUPLICATE/);
  assert.match(source, /previous_saved AS/);
  assert.match(source, /live_saved AS/);
});

test("sitemap uses a stable release timestamp", async () => {
  const source = await readText("app/sitemap.ts");
  assert.match(source, /SITE_LAST_UPDATED_AT/);
  assert.doesNotMatch(source, /const modified = new Date\(\)/);
});
