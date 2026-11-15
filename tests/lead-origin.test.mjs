import assert from "node:assert/strict";
import test from "node:test";
import { detectLeadOrigin, leadOrigin, withLeadOrigin } from "../app/lib/lead-origin.ts";

test("origin uses campaign or genuine referring domains without inventing a source", () => {
  assert.equal(detectLeadOrigin("https://merlyimport.com/?utm_source=facebook", ""), "Facebook");
  assert.equal(detectLeadOrigin("https://merlyimport.com/", "https://chatgpt.com/"), "ChatGPT");
  assert.equal(detectLeadOrigin("https://merlyimport.com/", "https://www.google.com.pe/search?q=test"), "Google");
  assert.equal(detectLeadOrigin("https://merlyimport.com/", "https://google.com.evil.test/"), "Otra referencia");
  assert.equal(detectLeadOrigin("https://merlyimport.com/", ""), null);
  assert.equal(detectLeadOrigin("https://merlyimport.com/productos", "https://merlyimport.com/"), null);
});

test("origin survives navigation, storage denial and does not duplicate the message suffix", () => {
  const values = new Map();
  globalThis.window = { location: { href: "https://merlyimport.com/?utm_source=tiktok" }, sessionStorage: { getItem: k => values.get(k), setItem: (k,v) => values.set(k,v) } };
  globalThis.document = { referrer: "" };
  try {
    assert.equal(leadOrigin(), "TikTok");
    window.location.href = "https://merlyimport.com/catalogo";
    assert.equal(leadOrigin(), "TikTok");
    const text = withLeadOrigin("Quiero cotizar");
    assert.equal(text, "Quiero cotizar\n\nOrigen: Web · TikTok");
    assert.equal(withLeadOrigin(text), text);
    window.sessionStorage.getItem = () => { throw new Error("blocked"); };
    assert.equal(leadOrigin(), "Directo / no identificado");
  } finally { delete globalThis.window; delete globalThis.document; }
});
