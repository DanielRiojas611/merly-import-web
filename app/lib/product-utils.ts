import type { Product } from "../catalogo/products";

const INTERNAL_BRANDS = new Set(["POR VALIDAR", "REVISION_MANUAL", "REVISIÓN MANUAL", "VALIDAR", "PENDIENTE"]);
const BRAND_ALIASES = new Map<string, string>([
  ["HICELL 33", "HICELL"], ["HICELL 34", "HICELL"],
]);
const OWN_BRANDS = new Set(["UTIL", "TOÑITO", "PIBE", "PROMIL", "HICELL", "MERLY", "MERLITA"]);
const INTERNAL_BADGES = new Set(["COMPRA LOCAL", "REVISIÓN DE MARCA", "REVISION DE MARCA"]);
const LOWERCASE_WORDS = new Set(["a", "al", "con", "de", "del", "en", "la", "las", "los", "o", "para", "por", "sin", "y"]);
const KEEP_UPPER = /^(?:AA|AAA|UV|2B|3X1|NPH\d+|TNT\d+|LWE\d+|LWF\d+|LWW\d+|[A-Z]{1,5}-?\d+[A-Z0-9-]*|#\d+)$/i;
const INCOMPLETE_COPY = /(?:por\s+confirmar|pendiente\s+de\s+confirmar|contenido\s+pendiente)/i;

type QuoteProduct = Pick<Product, "brand" | "name"> & Partial<Pick<Product, "id" | "presentation">>;

export function comparableText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function hasMostlyUppercase(value: string) {
  const letters = value.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? [];
  if (letters.length < 4) return false;
  const uppercase = letters.filter((letter) => letter === letter.toLocaleUpperCase("es") && letter !== letter.toLocaleLowerCase("es")).length;
  return uppercase / letters.length >= 0.8;
}

function editorialCase(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean || !hasMostlyUppercase(clean)) return clean;
  return clean.split(" ").map((token, index) => {
    if (!token || token === "&" || KEEP_UPPER.test(token)) return token.toUpperCase();
    const lower = token.toLocaleLowerCase("es");
    if (index > 0 && LOWERCASE_WORDS.has(lower)) return lower;
    return `${lower.charAt(0).toLocaleUpperCase("es")}${lower.slice(1)}`;
  }).join(" ");
}

export function normalizeBrand(value: string | null | undefined) {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!clean || INTERNAL_BRANDS.has(clean.toUpperCase())) return "";
  return BRAND_ALIASES.get(clean.toUpperCase()) ?? clean;
}

export function isOwnBrand(brand: string | null | undefined, explicit = false) {
  return explicit || OWN_BRANDS.has(normalizeBrand(brand).toUpperCase());
}

export function displayProductName(brand: string | null | undefined, name: string) {
  const cleanName = name.replace(/\s+/g, " ").trim();
  const cleanBrand = normalizeBrand(brand);
  if (!cleanBrand || !cleanName) return editorialCase(cleanName);
  const normalizedName = comparableText(cleanName);
  const normalizedBrand = comparableText(cleanBrand);
  if (normalizedName === normalizedBrand) return editorialCase(cleanName);
  if (normalizedName.startsWith(`${normalizedBrand} `)) {
    const candidate = cleanName.slice(cleanBrand.length).replace(/^\s+/, "");
    return editorialCase(candidate || cleanName);
  }
  return editorialCase(cleanName);
}

export function displayProductPresentation(value: string | null | undefined) {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "Presentación mayorista";
  if (INCOMPLETE_COPY.test(clean)) return "Presentación mayorista";
  return clean
    .replace(/^CAJA\s+X\s+/i, "Caja x ")
    .replace(/^PAQUETE\s+X\s+/i, "Paquete x ")
    .replace(/^FARDO\s+X\s+/i, "Fardo x ")
    .replace(/\bUND(?:ADES)?\b/gi, "unidades")
    .replace(/\bDOC(?:ENAS)?\b/gi, "docenas")
    .replace(/\bPQT\b/gi, "paquetes")
    .replace(/\bBLISTER(?:ES)?\b/gi, "blísteres")
    .replace(/\bGR\b/g, "g")
    .replace(/\bML\b/g, "ml")
    .replace(/\bKG\b/g, "kg");
}

export function isPublicProductComplete(product: Pick<Product, "name" | "presentation" | "description">) {
  return !INCOMPLETE_COPY.test([product.name, product.presentation, product.description ?? ""].join(" "));
}

export function productQuoteName(product: QuoteProduct) {
  const brand = normalizeBrand(product.brand);
  const name = displayProductName(brand, product.name);
  const title = [brand, name].filter(Boolean).join(" ");
  const details = [
    product.id ? `SKU: ${product.id.toUpperCase()}` : "",
    product.presentation ? displayProductPresentation(product.presentation) : "",
  ].filter(Boolean);
  return details.length ? `${title} | ${details.join(" | ")}` : title;
}

export function productSemanticKey(product: Pick<Product, "brand" | "name" | "presentation">) {
  return [normalizeBrand(product.brand), displayProductName(product.brand, product.name), displayProductPresentation(product.presentation)]
    .map(comparableText).join("|");
}

export function normalizeQuantity(value: unknown, maximum = 999) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(maximum, Math.max(0, Math.trunc(number)));
}

export function isPlaceholderImage(value: string | null | undefined) {
  const image = String(value ?? "").trim();
  return !image || image.startsWith("data:image") || /(?:product-placeholder\.svg|placeholder[^/]*\.(?:svg|webp|png)|fotograf(?:i|%c3%ad)a(?:\s|%20)pendiente)/i.test(image);
}

export function publicProductImage(_id: string, value: string | null | undefined) {
  const image = String(value ?? "").trim();
  return isPlaceholderImage(image) ? "/products/product-placeholder.svg" : image;
}

export function publicProductBadge(badge: string | null | undefined, ownBrand: boolean) {
  if (ownBrand) return "Marca propia";
  const clean = String(badge ?? "").replace(/\s+/g, " ").trim();
  if (!clean || INTERNAL_BADGES.has(clean.toUpperCase())) return "";
  return clean;
}

export function productUnitLabel(product: Pick<Product, "salesUnit">, quantity: number) {
  const unit = product.salesUnit ?? "caja";
  const labels: Record<string, [string, string]> = {
    caja: ["caja", "cajas"], unidad: ["unidad", "unidades"], docena: ["docena", "docenas"],
    exhibidor: ["exhibidor", "exhibidores"], paquete: ["paquete", "paquetes"],
    blister: ["blíster", "blísteres"], kilogramo: ["kilogramo", "kilogramos"], otro: ["unidad", "unidades"],
  };
  const [singular, plural] = labels[unit] ?? labels.otro;
  return `${quantity} ${quantity === 1 ? singular : plural}`;
}
