import type { Product } from "../catalogo/products";
import { productQuoteName } from "./product-utils";

export const SEO_PILOT_PRODUCT_IDS = [
  "pibe-panitos-100",
  "tonito-venditas",
  "hicell-aa-12-blisters",
  "espg20",
  "esv-m-0001",
  "my-05",
  "promil-doctor-max-204",
  "tnt-03",
  "teje-17",
  "c025",
  "c027",
  "pa-a-0004",
  "gu-a-0007",
  "es-c-0001",
  "sh-c-0001",
  "ce-c-0006",
  "pad-c-0017",
  "pad-c-0016",
  "ja-d-0002",
  "pi-d-0001",
] as const;

const seoPilotIds = new Set<string>(SEO_PILOT_PRODUCT_IDS);

export function isSeoPilotProductId(id: string) {
  return seoPilotIds.has(id);
}

export function slugifyProduct(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

export function productSlug(product: Pick<Product, "id" | "brand" | "name">) {
  const label = productQuoteName(product) || product.id;
  const readable = slugifyProduct(label) || "producto";
  return `${readable}--${product.id}`;
}

export function productPath(product: Pick<Product, "id" | "brand" | "name">) {
  return `/productos/${productSlug(product)}`;
}

export function productIdFromSlug(slug: string) {
  const separator = slug.lastIndexOf("--");
  if (separator < 1) return null;
  const id = slug.slice(separator + 2);
  if (!/^[a-zA-Z0-9._-]{1,120}$/.test(id)) return null;
  return isSeoPilotProductId(id) ? id : null;
}

export function productSeoDescription(product: Pick<Product, "brand" | "name" | "presentation">) {
  const name = productQuoteName(product);
  return `${name} para venta mayorista. Presentación: ${product.presentation}. Cotiza disponibilidad y envío a todo el Perú.`;
}

export function productPageSummary(product: Pick<Product, "brand" | "name" | "presentation">) {
  const name = productQuoteName(product);
  return `${name} disponible para venta mayorista en la presentación ${product.presentation}. Solicita precio, disponibilidad y condiciones de entrega para Lima o provincias.`;
}

export function absoluteProductImage(product: Pick<Product, "image">, base: URL) {
  return new URL(product.image, base).toString();
}
