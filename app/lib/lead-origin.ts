const STORAGE_KEY = "merly-lead-origin-v1";
const DIRECT = "Directo / no identificado";
const SOURCES: Record<string, string> = {
  google: "Google", google_ads: "Google Ads", chatgpt: "ChatGPT", facebook: "Facebook",
  fb: "Facebook", instagram: "Instagram", ig: "Instagram", tiktok: "TikTok",
  whatsapp: "WhatsApp", bing: "Bing", gemini: "Gemini", perplexity: "Perplexity",
};

export function detectLeadOrigin(url: string, referrer: string): string | null {
  const current = new URL(url);
  const source = current.searchParams.get("utm_source")?.toLowerCase();
  if (source) return SOURCES[source] ?? "Otra campaña";
  if (current.searchParams.has("gclid")) return "Google Ads";
  if (!referrer) return null;
  let ref: URL;
  try { ref = new URL(referrer); } catch { return null; }
  if (ref.hostname === current.hostname || [current.hostname, ref.hostname].every(h => /^(www\.)?merlyimport\.com$/.test(h))) return null;
  const host = ref.hostname.toLowerCase();
  const matches = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (matches("chatgpt.com") || matches("chat.openai.com")) return "ChatGPT";
  if (matches("facebook.com") || matches("fb.com")) return "Facebook";
  if (matches("instagram.com")) return "Instagram";
  if (matches("tiktok.com")) return "TikTok";
  if (matches("gemini.google.com")) return "Gemini";
  if (/^(www\.)?google\.(com|com\.pe|es|co\.uk)$/.test(host)) return "Google";
  if (matches("bing.com")) return "Bing";
  if (matches("perplexity.ai")) return "Perplexity";
  return "Otra referencia";
}

export function leadOrigin(): string {
  if (typeof window === "undefined") return DIRECT;
  const detected = detectLeadOrigin(window.location.href, document.referrer);
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    const validSaved = saved && [...Object.values(SOURCES), "Otra campaña", "Otra referencia"].includes(saved) ? saved : null;
    const explicit = new URL(window.location.href).searchParams;
    const origin = (explicit.has("utm_source") || explicit.has("gclid")) ? detected : validSaved ?? detected;
    if (origin) window.sessionStorage.setItem(STORAGE_KEY, origin);
    return origin ?? DIRECT;
  } catch { return detected ?? DIRECT; }
}

export function withLeadOrigin(message: string): string {
  if (/^Origen: Web · /m.test(message)) return message;
  return `${message}\n\nOrigen: Web · ${leadOrigin()}`;
}
