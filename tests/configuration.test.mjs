import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readText = (path) => readFile(new URL(path, root), "utf8");
const exists = (path) => existsSync(new URL(path, root));

test("production scripts use the Next.js runtime", async () => {
  const packageJson = JSON.parse(await readText("package.json"));

  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.scripts.start, "next start");
  assert.match(packageJson.scripts.check, /typecheck/);
  assert.match(packageJson.scripts.check, /lint/);
  assert.match(packageJson.scripts.check, /test/);
  assert.match(packageJson.scripts.check, /build:production/);
});

test("Next.js uses one TypeScript configuration", async () => {
  const nextConfig = await readText("next.config.ts");
  const tsconfig = JSON.parse(await readText("tsconfig.json"));

  assert.doesNotMatch(nextConfig, /tsconfig\.vercel\.json/);
  assert.equal(tsconfig.compilerOptions.target, "ES2017");
  assert.ok(tsconfig.include.includes("app/**/*.tsx"));
  assert.ok(tsconfig.include.includes("next.config.ts"));
});

test("content preview supplies every required home property", async () => {
  const previewPage = await readText("app/admin/contenido/vista-previa/page.tsx");

  assert.match(previewPage, /content=\{content\}/);
  assert.match(previewPage, /featuredProducts=\{/);
  assert.match(previewPage, /whatsappNumber=\{/);
  assert.match(previewPage, /previewMode/);
});

test("legacy runtimes and generated Base64 sources are absent", () => {
  for (const path of [
    ".openai",
    ".vinext",
    "app/chatgpt-auth.ts",
    "app/generated",
    "build",
    "db",
    "examples",
    "public/products/acdc-0001.webp.b64",
    "vite.config.ts",
    "worker",
  ]) {
    assert.equal(exists(path), false, `${path} must not exist`);
  }
});
