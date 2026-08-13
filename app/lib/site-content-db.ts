import { neon } from "@neondatabase/serverless";
import { siteAssets } from "../site-content";
import { CONTACT_EMAIL, FACEBOOK_URL, TIKTOK_URL, WHATSAPP_LABEL, WHATSAPP_NUMBER } from "./brand";

export type SiteBanner = { id: string; kicker: string; title: string; body: string; ctaLabel: string; ctaHref: string; theme: "brand" | "offers" | "delivery"; imageUrl: string; mobileImageUrl: string; isActive: boolean; sortOrder: number };
export type SideBannerContent = { kicker: string; title: string; body: string; ctaLabel: string; ctaHref: string; imageUrl: string };
export type ContactSettings = { phone: string; phoneLabel: string; email: string };
export type HomepageSettings = {
  sideBanners: { presale: SideBannerContent; delivery: SideBannerContent };
  labels: { searchButton: string; headerQuote: string; headerWhatsapp: string; catalogButton: string; quoteButton: string; tiktok: string };
  contact: ContactSettings;
  facebookUrl: string;
  tiktokUrl: string;
};
export type SiteContent = { banners: SiteBanner[]; settings: HomepageSettings };

const LIVE_SETTINGS_KEY = "homepage_content";
const DRAFT_SETTINGS_KEY = "homepage_content_draft";
const PREVIOUS_SETTINGS_KEY = "homepage_content_previous";

export const defaultHomepageSettings: HomepageSettings = {
  sideBanners: {
    presale: { kicker: "Preventa mayorista", title: "Separa stock antes de campaña", body: "Consulta disponibilidad, volumen y fecha estimada para compras programadas.", ctaLabel: "Ver preventa", ctaHref: "#preventa", imageUrl: "/banners/preventa-logistica-marcas-v12.webp" },
    delivery: { kicker: "Logistica Merly", title: "Despacho para Lima y provincias", body: "Coordinamos cada pedido por WhatsApp con datos claros de entrega y agencia.", ctaLabel: "Ver entregas", ctaHref: "#entregas", imageUrl: "/banners/merly-logistica-hero.png" },
  },
  labels: { searchButton: "Buscar", headerQuote: "Cotizar", headerWhatsapp: "WhatsApp", catalogButton: "Ver catalogo", quoteButton: "Continuar por WhatsApp", tiktok: "Síguenos en TikTok" },
  contact: { phone: WHATSAPP_NUMBER, phoneLabel: WHATSAPP_LABEL, email: CONTACT_EMAIL },
  facebookUrl: FACEBOOK_URL,
  tiktokUrl: TIKTOK_URL,
};

const defaultBanners: SiteBanner[] = [
  {
    id: "merly-mayorista",
    kicker: "Importadora mayorista",
    title: "Surtido de alta rotacion para negocios",
    body: "Abastece tu bodega, botica o distribuidora con lineas de higiene, limpieza, hogar y consumo masivo.",
    ctaLabel: "Ver catalogo",
    ctaHref: "/catalogo",
    theme: "brand",
    imageUrl: siteAssets.banners.ownBrands,
    mobileImageUrl: siteAssets.banners.ownBrandsMobile,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "merly-entregas",
    kicker: "Logistica Merly",
    title: "Importacion, almacen y despacho coordinado",
    body: "Cotiza por volumen y coordina salida de mercaderia para Lima o agencia a provincias.",
    ctaLabel: "Cotizar ahora",
    ctaHref: "/catalogo",
    theme: "delivery",
    imageUrl: siteAssets.banners.nationwideDelivery,
    mobileImageUrl: siteAssets.banners.nationwideDelivery,
    isActive: true,
    sortOrder: 2,
  },
];

const defaultSiteContent: SiteContent = {
  banners: defaultBanners,
  settings: defaultHomepageSettings,
};

function databaseUrl() { return process.env.DATABASE_URL?.trim() ?? ""; }
function database() { const value = databaseUrl(); if (!value) throw new Error("DATABASE_URL_MISSING"); return neon(value); }
function text(value: unknown, fallback: string, maximum = 300) { return typeof value === "string" && value.trim() ? value.trim().slice(0, maximum) : fallback; }
function optionalText(value: unknown, fallback: string, maximum = 2_000) { return typeof value === "string" ? value.trim().slice(0, maximum) : fallback; }
function digits(value: unknown, fallback: string) { const result = String(value ?? "").replace(/\D/g, "").slice(0, 15); return result || fallback; }
function phoneLabel(value: string) {
  const local = value.startsWith("51") && value.length === 11 ? value.slice(2) : value;
  return local.length === 9 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : local;
}
function mergeSideBanner(value: unknown, fallback: SideBannerContent): SideBannerContent {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { kicker: text(source.kicker, fallback.kicker, 60), title: text(source.title, fallback.title, 120).replace(/\bcampana\b/gi, "campaña"), body: text(source.body, fallback.body, 260), ctaLabel: text(source.ctaLabel, fallback.ctaLabel, 60), ctaHref: text(source.ctaHref, fallback.ctaHref, 500), imageUrl: optionalText(source.imageUrl, fallback.imageUrl) };
}
function normalizeContact(value: unknown): ContactSettings {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const fallback = defaultHomepageSettings.contact;
  const phone = digits(source.phone, fallback.phone);
  return { phone, phoneLabel: phoneLabel(phone), email: text(source.email, fallback.email, 150) };
}
export function normalizeHomepageSettings(value: unknown): HomepageSettings {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const sideBanners = source.sideBanners && typeof source.sideBanners === "object" ? source.sideBanners as Record<string, unknown> : {};
  const labels = source.labels && typeof source.labels === "object" ? source.labels as Record<string, unknown> : {};
  return {
    sideBanners: { presale: mergeSideBanner(sideBanners.presale, defaultHomepageSettings.sideBanners.presale), delivery: mergeSideBanner(sideBanners.delivery, defaultHomepageSettings.sideBanners.delivery) },
    labels: { searchButton: text(labels.searchButton, defaultHomepageSettings.labels.searchButton, 40), headerQuote: text(labels.headerQuote, defaultHomepageSettings.labels.headerQuote, 40), headerWhatsapp: text(labels.headerWhatsapp, defaultHomepageSettings.labels.headerWhatsapp, 40), catalogButton: text(labels.catalogButton, "Ver catalogo", 50), quoteButton: text(labels.quoteButton, defaultHomepageSettings.labels.quoteButton, 60), tiktok: text(labels.tiktok, "Síguenos en TikTok", 40).replace(/^Siguenos\b/i, "Síguenos") },
    contact: normalizeContact(source.contact),
    facebookUrl: optionalText(source.facebookUrl, defaultHomepageSettings.facebookUrl, 500),
    tiktokUrl: TIKTOK_URL,
  };
}
function normalizeBanner(value: unknown, fallback: SiteBanner, index: number): SiteBanner {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const theme = source.theme === "offers" || source.theme === "delivery" ? source.theme : source.theme === "brand" ? "brand" : fallback.theme;
  return { id: text(source.id, fallback.id || `banner-${index + 1}`, 80), kicker: text(source.kicker, fallback.kicker, 60), title: text(source.title, fallback.title, 140), body: text(source.body, fallback.body, 300), ctaLabel: text(source.ctaLabel, fallback.ctaLabel, 60), ctaHref: text(source.ctaHref, fallback.ctaHref, 500), theme, imageUrl: optionalText(source.imageUrl, fallback.imageUrl), mobileImageUrl: optionalText(source.mobileImageUrl, fallback.mobileImageUrl), isActive: source.isActive !== false, sortOrder: Number.isFinite(Number(source.sortOrder)) ? Math.trunc(Number(source.sortOrder)) : fallback.sortOrder };
}
function normalizeSiteContent(value: unknown, fallback: SiteContent): SiteContent {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rawBanners = Array.isArray(source.banners) ? source.banners : [];
  const fallbackById = new Map(fallback.banners.map((banner) => [banner.id, banner]));
  const banners = rawBanners.length ? rawBanners.slice(0, 12).map((item, index) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const id = typeof record.id === "string" ? record.id : "";
    const base = fallbackById.get(id) ?? fallback.banners[index] ?? fallback.banners[0];
    return normalizeBanner(item, base, index);
  }) : fallback.banners;
  return { banners: [...banners].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)), settings: normalizeHomepageSettings(source.settings ?? fallback.settings) };
}
async function getSetting(key: string) { const rows = await database().query(`SELECT value FROM site_settings WHERE key=$1 LIMIT 1`, [key]); return (rows[0] as { value?: unknown } | undefined)?.value; }
async function putSetting(key: string, value: unknown) { await database().query(`INSERT INTO site_settings (key,value,updated_at) VALUES ($1,$2::jsonb,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`, [key, JSON.stringify(value)]); }

export async function getSiteContent(): Promise<SiteContent> {
  if (!databaseUrl()) return defaultSiteContent;
  const sql = database();
  try {
    const [bannerRows, settingsRows] = await Promise.all([
      sql.query(`SELECT id,kicker,title,body,cta_label AS "ctaLabel",cta_href AS "ctaHref",theme,COALESCE(image_url,'') AS "imageUrl",COALESCE(mobile_image_url,'') AS "mobileImageUrl",is_active AS "isActive",sort_order AS "sortOrder" FROM banners ORDER BY sort_order,id`),
      sql.query(`SELECT value FROM site_settings WHERE key=$1 LIMIT 1`, [LIVE_SETTINGS_KEY]),
    ]);
    return {
      banners: (bannerRows.length ? bannerRows : defaultBanners) as SiteBanner[],
      settings: normalizeHomepageSettings((settingsRows[0] as { value?: unknown } | undefined)?.value),
    };
  } catch (error) {
    console.error("site_content_read_failed", error);
    return defaultSiteContent;
  }
}
export async function getSiteContentDraft(): Promise<SiteContent> { const live = await getSiteContent(); const draft = await getSetting(DRAFT_SETTINGS_KEY); return draft ? normalizeSiteContent(draft, live) : live; }
function validHref(value: string) { return value.startsWith("/") || value.startsWith("#") || value.startsWith("https://"); }
function validImage(value: string) { return !value || value.startsWith("/") || value.startsWith("https://"); }
function validateSideBanner(value: SideBannerContent) { if (!value.kicker || !value.title || !value.body || !value.ctaLabel) throw new Error("SIDE_BANNER_REQUIRED_FIELDS"); if (!validHref(value.ctaHref) || !validImage(value.imageUrl)) throw new Error("SIDE_BANNER_INVALID_ACTION"); }
function validateBanner(banner: SiteBanner) { if (!/^[a-zA-Z0-9._-]{1,80}$/.test(banner.id) || !banner.kicker || !banner.title || !banner.body) throw new Error("BANNER_REQUIRED_FIELDS"); if (!banner.ctaLabel || !validHref(banner.ctaHref) || !validImage(banner.imageUrl) || !validImage(banner.mobileImageUrl)) throw new Error("BANNER_INVALID_ACTION"); }
function validateContent(content: SiteContent) {
  if (!content.banners.length || !content.banners.some((banner) => banner.isActive)) throw new Error("ACTIVE_BANNER_REQUIRED");
  const ids = content.banners.map((banner) => banner.id); const orders = content.banners.map((banner) => banner.sortOrder);
  if (new Set(ids).size !== ids.length) throw new Error("BANNER_ID_DUPLICATE");
  if (new Set(orders).size !== orders.length) throw new Error("BANNER_ORDER_DUPLICATE");
  content.banners.forEach(validateBanner);
  validateSideBanner(content.settings.sideBanners.presale); validateSideBanner(content.settings.sideBanners.delivery);
  if (content.settings.facebookUrl && !content.settings.facebookUrl.startsWith("https://")) throw new Error("FACEBOOK_INVALID_URL");
  if (content.settings.tiktokUrl && !content.settings.tiktokUrl.startsWith("https://")) throw new Error("TIKTOK_INVALID_URL");
  if (!/^\S+@\S+\.\S+$/.test(content.settings.contact.email)) throw new Error("CONTACT_INVALID_EMAIL");
  if (!/^51\d{9}$/.test(content.settings.contact.phone)) throw new Error("CONTACT_INVALID_PHONE");
}

async function replaceLiveContent(content: SiteContent, previous: SiteContent) {
  const normalized = normalizeSiteContent(content, content);
  validateContent(normalized);
  const banners = normalized.banners.slice(0, 12);
  await database().query(
    `WITH incoming AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
         id text,kicker text,title text,body text,"ctaLabel" text,"ctaHref" text,theme text,
         "imageUrl" text,"mobileImageUrl" text,"isActive" boolean,"sortOrder" integer
       )
     ), upserted AS (
       INSERT INTO banners(id,kicker,title,body,cta_label,cta_href,theme,image_url,mobile_image_url,is_active,sort_order,updated_at)
       SELECT id,kicker,title,body,"ctaLabel","ctaHref",theme,NULLIF("imageUrl",''),NULLIF("mobileImageUrl",''),"isActive","sortOrder",NOW() FROM incoming
       ON CONFLICT(id) DO UPDATE SET kicker=EXCLUDED.kicker,title=EXCLUDED.title,body=EXCLUDED.body,cta_label=EXCLUDED.cta_label,cta_href=EXCLUDED.cta_href,theme=EXCLUDED.theme,image_url=EXCLUDED.image_url,mobile_image_url=EXCLUDED.mobile_image_url,is_active=EXCLUDED.is_active,sort_order=EXCLUDED.sort_order,updated_at=NOW()
       RETURNING id
     ), removed AS (
       DELETE FROM banners WHERE id NOT IN (SELECT id FROM incoming) RETURNING id
     ), previous_saved AS (
       INSERT INTO site_settings(key,value,updated_at) VALUES ($2,$3::jsonb,NOW())
       ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW() RETURNING key
     ), live_saved AS (
       INSERT INTO site_settings(key,value,updated_at) SELECT $4,$5::jsonb,NOW() FROM previous_saved
       ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW() RETURNING key
     )
     INSERT INTO site_settings(key,value,updated_at) SELECT $6,$7::jsonb,NOW() FROM live_saved
     ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`,
    [JSON.stringify(banners), PREVIOUS_SETTINGS_KEY, JSON.stringify(previous), LIVE_SETTINGS_KEY, JSON.stringify(normalized.settings), DRAFT_SETTINGS_KEY, JSON.stringify(normalized)],
  );
  return getSiteContent();
}

export async function saveSiteContentDraft(content: SiteContent) {
  const live = await getSiteContent(); const normalized = normalizeSiteContent(content, live); validateContent(normalized);
  await putSetting(DRAFT_SETTINGS_KEY, normalized); return normalized;
}
export async function publishSiteContent(content?: SiteContent) {
  const current = await getSiteContent();
  const draft = content ? normalizeSiteContent(content, current) : await getSiteContentDraft();
  return replaceLiveContent(draft, current);
}
export async function restorePreviousSiteContent() {
  const current = await getSiteContent(); const previousValue = await getSetting(PREVIOUS_SETTINGS_KEY);
  if (!previousValue) return null;
  return replaceLiveContent(normalizeSiteContent(previousValue, current), current);
}
export async function saveSiteContent(content: SiteContent) { return publishSiteContent(content); }
